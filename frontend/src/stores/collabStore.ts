import { create } from 'zustand';
import toast from 'react-hot-toast';
import { collabService, CollaborationSessionData, Participant, ElementLock } from '../services/collabService';
import { collabWebSocketService, CollabMessage } from '../services/collabWebSocketService';
import { useDiagramStore } from './diagramStore';
import { useAuthStore } from './authStore';
import { aiVoiceService } from '../services/aiVoiceService';
import { useProjectAiStore, formatAiEngineLabel } from './projectAiStore';
import { 
  continuousSessionService, 
  ContinuousSessionSnapshotDto, 
  ContinuousSessionSaveRequest 
} from '../services/continuousSessionService';

export interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  lastUpdate: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isAi?: boolean;
  intent?: string;
  actionSummary?: string;
  requesterName?: string;
  providerUsed?: string;
  actionType?: string;
  actionData?: Record<string, any>;
}

const persistCollabChat = (sessionCode: string | null | undefined, messages: ChatMessage[]) => {
  if (!sessionCode) return;
  try {
    sessionStorage.setItem(`case_collab_chat_${sessionCode.trim().toUpperCase()}`, JSON.stringify(messages.slice(-100)));
  } catch (e) {
    console.warn('Error guardando chat colaborativo en sessionStorage:', e);
  }
};

const getStoredCollabChat = (sessionCode: string | null | undefined): ChatMessage[] => {
  if (!sessionCode) return [];
  try {
    const raw = sessionStorage.getItem(`case_collab_chat_${sessionCode.trim().toUpperCase()}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

interface CollabState {
  session: CollaborationSessionData | null;
  isLive: boolean;
  sessionCode: string | null;
  role: 'host' | 'editor' | 'viewer' | null;
  myParticipant: Participant | null;
  participants: Participant[];
  locks: Record<string, ElementLock>;
  remoteCursors: Record<string, RemoteCursor>;
  chatMessages: ChatMessage[];
  unreadCount: number;
  isChatOpen: boolean;
  isLoading: boolean;
  isModalOpen: boolean;

  // Persistencia NoSQL de Sesiones Continuas (CU16 - MongoDB Atlas)
  savedSnapshots: ContinuousSessionSnapshotDto[];
  isSuspending: boolean;
  isResuming: boolean;
  isLoadingSnapshots: boolean;
  sessionEvents: any[];

  // Acciones de ciclo de vida
  startSession: (projectId: string) => Promise<void>;
  joinSession: (code: string, dni?: string, fullName?: string) => Promise<boolean>;
  endSession: () => Promise<void>;
  kickParticipant: (participantUserId: string) => Promise<void>;
  changeParticipantRole: (participantUserId: string, newRole: 'editor' | 'viewer') => Promise<void>;
  isViewer: () => boolean;
  leaveSession: () => Promise<void>;
  toggleGuestAccess: (allowGuests: boolean) => Promise<void>;
  setModalOpen: (open: boolean) => void;
  toggleChat: () => void;
  sendChatMessage: (text: string) => void;

  // Acciones de Sesión Continua y Reanudación (CU16)
  loadProjectSnapshots: (projectId: string) => Promise<void>;
  suspendAndSaveContinuousSession: (reason?: string) => Promise<boolean>;
  resumeContinuousSession: (sessionCode: string) => Promise<boolean>;
  deleteContinuousSnapshot: (snapshotId: string) => Promise<void>;
  checkAndRestoreActiveCollabSession: () => Promise<void>;

  // Acciones de difusión en tiempo real
  broadcastNodeMove: (nodeId: string, position: { x: number; y: number }, className?: string) => void;
  broadcastNodeUpdate: (nodeId: string, nodeData: any, className?: string) => void;
  broadcastNodeCreate: (node: any) => void;
  broadcastNodeDelete: (nodeId: string) => void;
  broadcastEdgeCreate: (edge: any) => void;
  broadcastEdgeUpdate: (edgeId: string, edgeData: any) => void;
  broadcastEdgeDelete: (edgeId: string) => void;
  broadcastSyncState: (nodes: any[], edges: any[]) => void;
  broadcastCursor: (x: number, y: number) => void;
  broadcastLock: (elementId: string) => void;
  broadcastUnlock: (elementId: string) => void;

  // Receptor de mensajes
  handleIncomingMessage: (msg: CollabMessage) => void;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  session: null,
  isLive: false,
  sessionCode: null,
  role: null,
  myParticipant: null,
  participants: [],
  locks: {},
  remoteCursors: {},
  chatMessages: [],
  unreadCount: 0,
  isChatOpen: typeof sessionStorage !== 'undefined' && sessionStorage.getItem('case_collab_chat_open') === 'true',
  isLoading: false,
  isModalOpen: false,
  savedSnapshots: [],
  isSuspending: false,
  isResuming: false,
  isLoadingSnapshots: false,
  sessionEvents: [],

  setModalOpen: (open: boolean) => set({ isModalOpen: open }),
  toggleChat: () =>
    set((state) => {
      const nextOpen = !state.isChatOpen;
      try {
        sessionStorage.setItem('case_collab_chat_open', String(nextOpen));
      } catch {}
      return {
        isChatOpen: nextOpen,
        unreadCount: nextOpen ? 0 : state.unreadCount
      };
    }),

  startSession: async (projectId: string) => {
    try {
      set({ isLoading: true });
      const sessionData = await collabService.startSession(projectId);

      const authUser = useAuthStore.getState().user;
      const myPart = sessionData.participants.find(
        (p) => p.userId === authUser?.userId || p.role === 'host'
      ) || {
        id: 'host-part',
        userId: authUser?.userId || 'host-id',
        fullName: authUser?.fullName || 'Arquitecto (Host)',
        dni: authUser?.username || '',
        role: 'host',
        cursorColor: '#6366F1',
        joinedAt: new Date().toISOString()
      };

      const initialLocks: Record<string, ElementLock> = {};
      sessionData.locks.forEach((l) => {
        initialLocks[l.elementId] = l;
      });

      const restoredChat = getStoredCollabChat(sessionData.sessionCode);

      set({
        session: sessionData,
        isLive: true,
        sessionCode: sessionData.sessionCode,
        role: 'host',
        myParticipant: myPart,
        participants: sessionData.participants,
        locks: initialLocks,
        chatMessages: restoredChat.length > 0 ? restoredChat : [],
        isLoading: false,
        isModalOpen: true
      });

      // Persistir código de sesión en sessionStorage para auto-reconexión tras recarga F5
      sessionStorage.setItem('case_active_collab_code', sessionData.sessionCode);

      // Conectar WebSocket STOMP
      await collabWebSocketService.connect(
        sessionData.sessionCode,
        (msg) => get().handleIncomingMessage(msg),
        () => {
          console.info(`✓ Conectado a sala WSS: ${sessionData.sessionCode}`);
        }
      );

      toast.success(`Sala en vivo iniciada: ${sessionData.sessionCode}`);
    } catch (error: any) {
      console.error('Error al iniciar sesión colaborativa:', error);
      toast.error(error.response?.data?.message || 'No se pudo iniciar la sala en vivo.');
      set({ isLoading: false });
    }
  },

  joinSession: async (code: string, dni?: string, fullName?: string) => {
    try {
      set({ isLoading: true });
      const cleanCode = code.trim().toUpperCase();
      const authUser = useAuthStore.getState().user || (() => {
        try {
          const raw = sessionStorage.getItem('sw1_volatile_user');
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();
      const userDni = dni || authUser?.username || '';
      const userName = fullName || authUser?.fullName || authUser?.username || 'Colaborador';

      const sessionData = await collabService.joinSession(cleanCode, userDni, userName);

      const myPart = sessionData.participants.find((p) => p.userId === authUser?.userId || (userDni && p.dni === userDni)) || {
        id: authUser?.userId || 'user-part',
        userId: authUser?.userId || 'user-id',
        fullName: userName,
        dni: userDni,
        role: 'editor',
        cursorColor: '#10B981',
        joinedAt: new Date().toISOString()
      };

      const initialLocks: Record<string, ElementLock> = {};
      sessionData.locks.forEach((l) => {
        initialLocks[l.elementId] = l;
      });

      if (sessionData.projectId) {
        localStorage.setItem('case_last_project_id', sessionData.projectId);
      }

      const restoredChat = getStoredCollabChat(cleanCode);

      set({
        session: sessionData,
        isLive: true,
        sessionCode: sessionData.sessionCode,
        role: (myPart.role as any) || 'editor',
        myParticipant: myPart,
        participants: sessionData.participants,
        locks: initialLocks,
        chatMessages: restoredChat.length > 0 ? restoredChat : [],
        unreadCount: 0,
        isLoading: false
      });

      // Persistir código de sesión en sessionStorage para auto-reconexión tras recarga F5
      sessionStorage.setItem('case_active_collab_code', cleanCode);

      // Conectar WebSocket STOMP
      await collabWebSocketService.connect(
        sessionData.sessionCode,
        (msg) => get().handleIncomingMessage(msg)
      );

      // Cargar diagrama inicial en el lienzo si viene en sessionData
      if (sessionData.initialDiagram) {
        const d = sessionData.initialDiagram;
        const diagramStore = useDiagramStore.getState();
        if (d.project) {
          diagramStore.setCurrentProject(d.project);
        }
        if (d.classNodes || d.relationships) {
          const mappedNodes = (d.classNodes || []).map((cn: any) => ({
            id: cn.id,
            type: 'classNode',
            position: { x: cn.positionX || cn.position_x || 0, y: cn.positionY || cn.position_y || 0 },
            data: {
              id: cn.id,
              name: cn.name,
              stereotype: cn.stereotype,
              isAbstract: cn.isAbstract || cn.is_abstract || false,
              attributes: cn.attributes || [],
              methods: cn.methods || []
            }
          }));

          const mappedEdges = (d.relationships || []).map((rel: any) => ({
            id: rel.id,
            source: rel.sourceClass?.id || rel.source_class_id,
            target: rel.targetClass?.id || rel.target_class_id,
            type: 'umlEdge',
            sourceHandle: rel.sourceHandle || rel.source_handle || 'right',
            targetHandle: rel.targetHandle || rel.target_handle || 'left',
            data: {
              type: (rel.type || 'association').toLowerCase(),
              sourceCardinality: rel.sourceCardinality || rel.source_cardinality || '1',
              targetCardinality: rel.targetCardinality || rel.target_cardinality || '*',
              label: rel.label || '',
              sourceRole: rel.sourceRole || rel.source_role || '',
              targetRole: rel.targetRole || rel.target_role || ''
            }
          }));

          diagramStore.setNodes(mappedNodes);
          diagramStore.setEdges(mappedEdges);
        }
      }

      toast.success(`¡Conectado a la sala en vivo ${sessionData.sessionCode}!`);
      return true;
    } catch (error: any) {
      console.error('Error al unirse a sala:', error);
      toast.error(error.response?.data?.message || 'Código de sala inválido o finalizada.');
      set({ isLoading: false });
      return false;
    }
  },

  endSession: async () => {
    const { sessionCode } = get();
    if (!sessionCode) return;

    try {
      await collabService.endSession(sessionCode);
      sessionStorage.removeItem('case_active_collab_code');
      sessionStorage.removeItem(`case_collab_chat_${sessionCode}`);
      sessionStorage.removeItem('case_collab_chat_open');
      collabWebSocketService.disconnect();
      set({
        session: null,
        isLive: false,
        sessionCode: null,
        role: null,
        myParticipant: null,
        participants: [],
        locks: {},
        remoteCursors: {},
        chatMessages: [],
        unreadCount: 0,
        isChatOpen: false,
        isModalOpen: false
      });
      toast.success('Sesión colaborativa finalizada');
    } catch (error: any) {
      console.error('Error al finalizar sesión:', error);
      toast.error(error.response?.data?.message || 'No se pudo finalizar la sesión.');
    }
  },

  kickParticipant: async (participantUserId: string) => {
    const { sessionCode } = get();
    if (!sessionCode) return;
    try {
      await collabService.kickParticipant(sessionCode, participantUserId);
      set((state) => ({
        participants: state.participants.filter((p) => p.userId !== participantUserId)
      }));
      toast.success('Participante expulsado de la sala');
    } catch (err: any) {
      console.error('Error al expulsar participante:', err);
      toast.error(err.response?.data?.message || 'No se pudo expulsar al participante');
    }
  },

  changeParticipantRole: async (participantUserId: string, newRole: 'editor' | 'viewer') => {
    const { sessionCode, participants } = get();
    if (!sessionCode) return;
    const previousParticipants = [...participants];
    // Optimistic update inmediato
    set({
      participants: participants.map((p) =>
        p.userId === participantUserId ? { ...p, role: newRole } : p
      )
    });
    try {
      await collabService.updateParticipantRole(sessionCode, participantUserId, newRole);
      toast.success(`Rol modificado a ${newRole === 'viewer' ? 'Solo Lectura (Lector)' : 'Editor'}`);
    } catch (err: any) {
      console.error('Error al actualizar rol de participante:', err);
      set({ participants: previousParticipants });
      toast.error(err.response?.data?.message || 'No se pudo actualizar el rol');
    }
  },

  toggleGuestAccess: async (allowGuests: boolean) => {
    const { sessionCode, session } = get();
    if (!sessionCode) return;
    try {
      await collabService.toggleGuestAccess(sessionCode, allowGuests);
      set({
        session: session ? { ...session, status: allowGuests ? 'active' : 'paused' } : null
      });
      toast.success(allowGuests ? 'Acceso a colaboradores habilitado' : 'Acceso a colaboradores pausado');
    } catch (err: any) {
      console.error('Error al cambiar acceso a sala:', err);
      toast.error(err.response?.data?.message || 'No se pudo cambiar el estado de acceso');
    }
  },

  isViewer: () => {
    const { role, myParticipant } = get();
    return role === 'viewer' || myParticipant?.role === 'viewer';
  },

  sendChatMessage: async (text: string) => {
    const { sessionCode, myParticipant, isLive } = get();
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // A) MODO COLABORATIVO (EN VIVO POR WEBSOCKET STOMP)
    if (isLive && sessionCode && myParticipant) {
      const isAiMention = trimmedText.toLowerCase().includes('@ai');

      const chatPayload: any = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: trimmedText
      };

      if (isAiMention) {
        const diagram = useDiagramStore.getState();
        chatPayload.diagramSnapshot = {
          nodes: diagram.nodes.map((n) => ({
            id: n.id,
            position: n.position,
            data: {
              name: n.data.name,
              attributes: n.data.attributes,
              methods: n.data.methods,
              isAbstract: n.data.isAbstract
            }
          })),
          edges: diagram.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            data: e.data
          }))
        };
      }

      collabWebSocketService.sendMessage({
        type: 'CHAT' as any,
        senderId: myParticipant.userId,
        senderName: myParticipant.fullName,
        senderColor: myParticipant.cursorColor,
        sessionCode,
        payload: chatPayload,
        timestamp: Date.now()
      });

      const localMsg: ChatMessage = {
        id: chatPayload.id,
        senderId: myParticipant.userId,
        senderName: myParticipant.fullName,
        senderColor: myParticipant.cursorColor,
        text: trimmedText,
        timestamp: Date.now()
      };

      set((state) => {
        const updated = [...state.chatMessages, localMsg];
        persistCollabChat(sessionCode, updated);
        return { chatMessages: updated };
      });
      return;
    }

    // B) MODO SOLITARIO (DIRECTO CON ASISTENTE IA VIA REST)
    const authUser = useAuthStore.getState().user;
    const diagramStore = useDiagramStore.getState();
    const currentProj = diagramStore.project;

    const senderId = authUser?.userId || 'solo-user';
    const senderName = authUser?.fullName || authUser?.username || 'Tú';
    const senderColor = '#6366f1';
    const soloCode = currentProj?.id ? `PROJ-${currentProj.id}` : `SOLO-${senderId}`;

    const userMsg: ChatMessage = {
      id: `solo-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      senderName,
      senderColor,
      text: trimmedText,
      timestamp: Date.now()
    };

    set((state) => {
      const updated = [...state.chatMessages, userMsg];
      persistCollabChat(soloCode, updated);
      return { chatMessages: updated };
    });

    const isAiMention = trimmedText.toLowerCase().includes('@ai');
    if (isAiMention) {
      try {
        const diagramSnapshot = {
          nodes: diagramStore.nodes.map((n) => ({
            id: n.id,
            position: n.position,
            data: {
              name: n.data.name,
              attributes: n.data.attributes,
              methods: n.data.methods,
              isAbstract: n.data.isAbstract
            }
          })),
          edges: diagramStore.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            data: e.data
          }))
        };

        const aiResp = await aiVoiceService.sendTeamChat({
          prompt: trimmedText,
          projectId: currentProj?.id,
          sessionCode: currentProj?.id ? `PROJ-${currentProj.id}` : `SOLO-${senderId}`,
          diagramSnapshot
        });

        if (aiResp) {
          const aiMsg: ChatMessage = {
            id: `ai-msg-${Date.now()}`,
            senderId: '00000000-0000-0000-0000-000000000000',
            senderName: 'Asistente IA (Co-Dev)',
            senderColor: '#6366f1',
            text: aiResp.chatResponse,
            timestamp: Date.now(),
            isAi: true,
            intent: aiResp.intent,
            actionSummary: aiResp.actionSummary,
            requesterName: senderName,
            providerUsed: (aiResp as any).providerUsed,
            actionType: (aiResp as any).actionType,
            actionData: (aiResp as any).actionData
          };

          set((state) => {
            const updated = [...state.chatMessages, aiMsg];
            persistCollabChat(soloCode, updated);
            return { chatMessages: updated };
          });

          // Acciones operativas de proyecto en modo solitario (CU14)
          const respAction = (aiResp as any).actionType;
          if (respAction === 'SAVE_PROJECT') {
            diagramStore.saveDiagram().then(() => {
              toast.success('Proyecto guardado y sincronizado en PostgreSQL 17 por Asistente IA.');
            }).catch((err) => {
              console.error('Error al guardar proyecto tras orden de IA:', err);
            });
          } else if (respAction === 'EXPORT_BACKEND') {
            window.dispatchEvent(new CustomEvent('case_open_backend_modal'));
          } else if (respAction === 'EXPORT_SQL') {
            const curP = diagramStore.project;
            if (curP?.id) {
              import('../services/generatorService').then(({ downloadSqlDdl }) => {
                downloadSqlDdl(curP.id, curP.name).then(() => {
                  toast.success('Esquema DDL SQL exportado directamente.');
                }).catch(() => window.dispatchEvent(new CustomEvent('case_open_sql_modal')));
              });
            } else {
              window.dispatchEvent(new CustomEvent('case_open_sql_modal'));
            }
          } else if (respAction === 'EXPORT_PNG') {
            const curP = diagramStore.project;
            const curNodes = diagramStore.nodes;
            if (curP?.name && curNodes.length > 0) {
              import('../services/exportService').then(({ exportDiagramPng }) => {
                exportDiagramPng(curNodes, curP.name, { scale: 2, backgroundColor: '#0f1115' }).then(() => {
                  toast.success('Diagrama PNG exportado directamente.');
                });
              });
            }
          } else if (respAction === 'EXPORT_PDF') {
            const curP = diagramStore.project;
            const curNodes = diagramStore.nodes;
            if (curP?.id && curP.name) {
              import('../services/exportService').then(({ exportDiagramPdf }) => {
                exportDiagramPdf(curP.id, curP.name, curNodes, { includeImage: true, includeDictionary: true, includeRelationships: true }).then(() => {
                  toast.success('Memoria técnica PDF generada directamente.');
                });
              });
            }
          } else if (respAction === 'EXPORT_OPTIONS') {
            // Despliega el catálogo de 6 opciones en el chat sin abrir modales
            toast.success('Catálogo de 6 formatos disponible en el chat.');
          }

          if (Array.isArray(aiResp.mutations) && aiResp.mutations.length > 0) {
            diagramStore.applyVoiceMutations(aiResp.mutations);
            toast.success(`Asistente IA aplicó cambios al modelo (Ctrl+Z para revertir)`, {
              id: `solo-ai-mut-${Date.now()}`
            });
          }
        }
      } catch (err: any) {
        console.error('Error al consultar al Asistente IA en modo solitario:', err);
        const errMsg: ChatMessage = {
          id: `ai-err-${Date.now()}`,
          senderId: '00000000-0000-0000-0000-000000000000',
          senderName: 'Asistente IA (Co-Dev)',
          senderColor: '#ef4444',
          text: `No pude procesar tu solicitud: ${err.response?.data?.message || err.message || 'Error de conexión con el servidor.'}`,
          timestamp: Date.now(),
          isAi: true
        };
        set((state) => ({
          chatMessages: [...state.chatMessages, errMsg]
        }));
      }
    }
  },

  leaveSession: async () => {
    const { sessionCode, isLive } = get();
    if (!isLive || !sessionCode) return;

    try {
      await collabService.leaveSession(sessionCode);
    } catch (e) {
      console.warn('Salida de sala colaborativa:', e);
    } finally {
      sessionStorage.removeItem('case_active_collab_code');
      sessionStorage.removeItem(`case_collab_chat_${sessionCode}`);
      sessionStorage.removeItem('case_collab_chat_open');
      collabWebSocketService.disconnect();
      set({
        session: null,
        isLive: false,
        sessionCode: null,
        role: null,
        myParticipant: null,
        participants: [],
        locks: {},
        remoteCursors: {},
        chatMessages: [],
        unreadCount: 0,
        isChatOpen: false,
        isModalOpen: false
      });
      useDiagramStore.getState().resetDiagram();
      localStorage.removeItem('case_last_project_id');
      toast('Has salido de la sesión colaborativa.', { id: 'collab-leave-self' });
      if (window.location.pathname.startsWith('/editor')) {
        window.location.href = '/projects';
      }
    }
  },

  broadcastNodeMove: (nodeId: string, position: { x: number; y: number }, className?: string) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'NODE_MOVE',
      { nodeId, position, className },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastNodeUpdate: (nodeId: string, nodeData: any, className?: string) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'NODE_UPDATE',
      { nodeId, nodeData, className },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastNodeCreate: (node: any) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'NODE_CREATE',
      { node },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastNodeDelete: (nodeId: string) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'NODE_DELETE',
      { nodeId },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastEdgeCreate: (edge: any) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'EDGE_CREATE',
      { edge },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastEdgeUpdate: (edgeId: string, edgeData: any) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'EDGE_UPDATE',
      { edgeId, edgeData },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastEdgeDelete: (edgeId: string) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'EDGE_DELETE',
      { edgeId },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastSyncState: (nodes: any[], edges: any[]) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'SYNC_STATE',
      { nodes, edges },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastCursor: (x: number, y: number) => {
    const { isLive, myParticipant, participants } = get();
    if (!isLive || !myParticipant) return;
    // Optimización híbrida: Si solo hay 1 usuario en la sala, ahorra tráfico de cursor
    if (participants.length <= 1) return;

    collabWebSocketService.sendCursor(x, y, {
      id: myParticipant.userId,
      name: myParticipant.fullName,
      color: myParticipant.cursorColor
    });
  },

  broadcastLock: (elementId: string) => {
    const { isLive, myParticipant, isViewer } = get();
    if (!isLive || !myParticipant || isViewer()) return;

    collabWebSocketService.sendLock(elementId, {
      id: myParticipant.userId,
      name: myParticipant.fullName,
      color: myParticipant.cursorColor
    });
  },

  broadcastUnlock: (elementId: string) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendUnlock(elementId, {
      id: myParticipant.userId,
      name: myParticipant.fullName,
      color: myParticipant.cursorColor
    });
  },

  handleIncomingMessage: (msg: CollabMessage) => {
    const { myParticipant } = get();
    // Ignorar ecos propios
    if (msg.senderId && myParticipant && msg.senderId === myParticipant.userId) {
      return;
    }

    const diagramStore = useDiagramStore.getState();

    switch (msg.type) {
      case 'NODE_MOVE': {
        const { nodeId, position, className } = msg.payload || {};
        if (nodeId && position) {
          const lowerName = className?.toLowerCase();
          diagramStore.setNodes((nodes: any[]) =>
            nodes.map((n: any) =>
              (n.id === nodeId || (lowerName && n.data?.name?.toLowerCase() === lowerName))
                ? { ...n, position }
                : n
            )
          );
        }
        break;
      }

      case 'NODE_UPDATE': {
        const { nodeId, nodeData, className } = msg.payload || {};
        if (nodeId && nodeData) {
          const lowerName = className?.toLowerCase();
          diagramStore.setNodes((nodes: any[]) =>
            nodes.map((n: any) =>
              (n.id === nodeId || (lowerName && n.data?.name?.toLowerCase() === lowerName))
                ? { ...n, data: { ...n.data, ...nodeData } }
                : n
            )
          );
        }
        break;
      }

      case 'NODE_CREATE': {
        const { node } = msg.payload || {};
        if (node) {
          diagramStore.setNodes((nodes: any[]) => {
            if (nodes.some((n: any) => n.id === node.id)) return nodes;
            return [...nodes, node];
          });
        }
        break;
      }

      case 'NODE_DELETE': {
        const { nodeId } = msg.payload || {};
        if (nodeId) {
          diagramStore.setNodes((nodes: any[]) => nodes.filter((n: any) => n.id !== nodeId));
          diagramStore.setEdges((edges: any[]) =>
            edges.filter((e: any) => e.source !== nodeId && e.target !== nodeId)
          );
        }
        break;
      }

      case 'EDGE_CREATE': {
        const { edge } = msg.payload || {};
        if (edge) {
          diagramStore.setEdges((edges: any[]) => {
            if (edges.some((e: any) => e.id === edge.id)) return edges;
            return [...edges, edge];
          });
        }
        break;
      }

      case 'EDGE_DELETE': {
        const { edgeId } = msg.payload || {};
        if (edgeId) {
          diagramStore.setEdges((edges: any[]) => edges.filter((e: any) => e.id !== edgeId));
        }
        break;
      }

      case 'EDGE_UPDATE': {
        const { edgeId, edgeData } = msg.payload || {};
        if (edgeId && edgeData) {
          diagramStore.setEdges((edges: any[]) =>
            edges.map((e: any) => (e.id === edgeId ? { ...e, data: { ...e.data, ...edgeData } } : e))
          );
        }
        break;
      }

      case 'SAVE_SYNC':
      case 'SYNC_STATE': {
        const { nodes, edges, mutations, requesterName } = msg.payload || {};
        if (Array.isArray(mutations) && mutations.length > 0) {
          diagramStore.applyVoiceMutations(mutations);
          const reqName = requesterName || 'un colaborador';
          toast.success(`Asistente IA aplicó cambios solicitados por @${reqName} (Ctrl+Z para revertir)`, {
            id: `ai-mut-${Date.now()}`
          });
        } else if (Array.isArray(nodes) && Array.isArray(edges)) {
          diagramStore.setNodes(nodes);
          diagramStore.setEdges(edges);
          toast.success('Diagrama sincronizado con la sesión', { id: 'collab-sync' });
        }
        break;
      }

      case 'CURSOR': {
        const { x, y } = msg.payload || {};
        if (msg.senderId && typeof x === 'number' && typeof y === 'number') {
          set((state) => ({
            remoteCursors: {
              ...state.remoteCursors,
              [msg.senderId!]: {
                userId: msg.senderId!,
                name: msg.senderName || 'Colaborador',
                color: msg.senderColor || '#10B981',
                x,
                y,
                lastUpdate: Date.now()
              }
            }
          }));
        }
        break;
      }

      case 'LOCK': {
        const { elementId, lockedByName, cursorColor, expiresAt } = msg.payload || {};
        if (elementId && msg.senderId) {
          set((state) => ({
            locks: {
              ...state.locks,
              [elementId]: {
                elementId,
                lockedBy: msg.senderId!,
                lockedByName: lockedByName || msg.senderName || 'Colaborador',
                cursorColor: cursorColor || msg.senderColor || '#10B981',
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 30000).toISOString()
              }
            }
          }));
        }
        break;
      }

      case 'UNLOCK': {
        const { elementId } = msg.payload || {};
        if (elementId) {
          set((state) => {
            const nextLocks = { ...state.locks };
            delete nextLocks[elementId];
            return { locks: nextLocks };
          });
        }
        break;
      }

      case 'JOIN': {
        const newPart: Participant = {
          id: msg.senderId || 'joined-part',
          userId: msg.senderId || 'joined-user',
          fullName: msg.senderName || 'Colaborador',
          dni: (msg.payload && msg.payload.dni) || '',
          role: (msg.payload && msg.payload.role) || 'editor',
          cursorColor: msg.senderColor || '#10B981',
          joinedAt: new Date().toISOString()
        };
        set((state) => {
          if (state.participants.some((p) => p.userId === newPart.userId)) return state;
          return { participants: [...state.participants, newPart] };
        });
        toast(`${newPart.fullName} se unió a la sala`, {
          id: `collab-join-${newPart.userId}`,
          style: { borderLeft: `4px solid ${newPart.cursorColor}` }
        });
        break;
      }

      case 'LEAVE': {
        if (msg.senderId) {
          set((state) => {
            const nextCursors = { ...state.remoteCursors };
            delete nextCursors[msg.senderId!];
            const nextLocks = { ...state.locks };
            Object.keys(nextLocks).forEach((k) => {
              if (nextLocks[k].lockedBy === msg.senderId) {
                delete nextLocks[k];
              }
            });
            return {
              participants: state.participants.filter((p) => p.userId !== msg.senderId),
              remoteCursors: nextCursors,
              locks: nextLocks
            };
          });
          const departingName = msg.senderName || 'Un participante';
          toast(`${departingName} ha salido de la sala.`, { id: `collab-leave-${msg.senderId}` });
        }
        break;
      }

      case 'STANDBY_STATE': {
        const { status } = msg.payload || {};
        if (status) {
          set((state) => ({
            session: state.session ? { ...state.session, status } : null
          }));
          if (status === 'paused') {
            toast('El anfitrión ha pausado el acceso a la sala colaborativa.', { id: 'collab-status-paused' });
          } else if (status === 'active') {
            toast.success('El anfitrión ha reanudado el acceso a la sala.', { id: 'collab-status-active' });
          }
        }
        break;
      }

      case 'SESSION_SUSPENDED': {
        const { role } = get();
        const details = (msg.payload && msg.payload.message) || 'El Host ha suspendido la sesión. Podrás reconectarte con el mismo código cuando sea reanudada.';
        toast(details, {
          id: 'collab-session-suspended',
          duration: 7000,
          style: {
            background: '#14171d',
            color: '#f8fafc',
            border: '1px solid #f59e0b',
            borderRadius: '12px'
          }
        });
        sessionStorage.removeItem('case_active_collab_code');
        collabWebSocketService.disconnect();
        set({
          session: null,
          isLive: false,
          sessionCode: null,
          role: null,
          myParticipant: null,
          participants: [],
          locks: {},
          remoteCursors: {},
          chatMessages: [],
          unreadCount: 0,
          isChatOpen: false,
          isModalOpen: false
        });
        if (role !== 'host') {
          useDiagramStore.getState().resetDiagram();
          localStorage.removeItem('case_last_project_id');
          window.location.href = '/projects';
        }
        break;
      }

      case 'SESSION_ENDED': {
        const { role } = get();
        toast.error('La sesión colaborativa ha sido finalizada por el anfitrión.', { id: 'collab-session-ended' });
        sessionStorage.removeItem('case_active_collab_code');
        collabWebSocketService.disconnect();
        set({
          session: null,
          isLive: false,
          sessionCode: null,
          role: null,
          myParticipant: null,
          participants: [],
          locks: {},
          remoteCursors: {},
          chatMessages: [],
          unreadCount: 0,
          isChatOpen: false,
          isModalOpen: false
        });
        // Si el usuario no es el anfitrión, limpiar diagrama y volver a Proyectos
        if (role !== 'host') {
          useDiagramStore.getState().resetDiagram();
          localStorage.removeItem('case_last_project_id');
          window.location.href = '/projects';
        }
        break;
      }

      case 'KICK': {
        const { kickedUserId, message } = msg.payload || {};
        const { myParticipant } = get();
        if (kickedUserId && myParticipant && kickedUserId === myParticipant.userId) {
          toast.error(message || 'Has sido expulsado de la sesión por el Arquitecto anfitrión.', { id: 'collab-kicked' });
          sessionStorage.removeItem('case_active_collab_code');
          collabWebSocketService.disconnect();
          set({
            session: null,
            isLive: false,
            sessionCode: null,
            role: null,
            myParticipant: null,
            participants: [],
            locks: {},
            remoteCursors: {},
            chatMessages: [],
            unreadCount: 0,
            isChatOpen: false,
            isModalOpen: false
          });
          useDiagramStore.getState().resetDiagram();
          localStorage.removeItem('case_last_project_id');
          window.location.href = '/projects';
        } else if (kickedUserId) {
          set((state) => {
            const nextCursors = { ...state.remoteCursors };
            delete nextCursors[kickedUserId];
            const nextLocks = { ...state.locks };
            Object.keys(nextLocks).forEach((k) => {
              if (nextLocks[k].lockedBy === kickedUserId) {
                delete nextLocks[k];
              }
            });
            return {
              participants: state.participants.filter((p) => p.userId !== kickedUserId),
              remoteCursors: nextCursors,
              locks: nextLocks
            };
          });
          toast('Un colaborador fue expulsado de la sala.', { id: `collab-kicked-${kickedUserId}` });
        }
        break;
      }

      case 'CHAT': {
        const chatMsg: ChatMessage = {
          id: msg.payload?.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          senderId: msg.senderId || 'unknown',
          senderName: msg.senderName || 'Colaborador',
          senderColor: msg.senderColor || '#10B981',
          text: msg.payload?.text || '',
          timestamp: msg.timestamp || Date.now(),
          isAi: msg.payload?.isAi || msg.senderId === '00000000-0000-0000-0000-000000000000',
          intent: msg.payload?.intent,
          actionSummary: msg.payload?.actionSummary,
          requesterName: msg.payload?.requesterName,
          providerUsed: msg.payload?.providerUsed,
          actionType: msg.payload?.actionType,
          actionData: msg.payload?.actionData
        };

        // Acciones operativas de proyecto emitidas por la IA en sala colaborativa (CU14)
        if (chatMsg.isAi && chatMsg.actionType) {
          if (chatMsg.actionType === 'SAVE_PROJECT') {
            useDiagramStore.getState().saveDiagram().then(() => {
              toast.success('Proyecto guardado y sincronizado por orden de IA en la sala.');
            }).catch((e) => console.error(e));
          } else if (chatMsg.actionType === 'EXPORT_BACKEND') {
            window.dispatchEvent(new CustomEvent('case_open_backend_modal'));
          } else if (chatMsg.actionType === 'EXPORT_SQL') {
            const curP = useDiagramStore.getState().project;
            if (curP?.id) {
              import('../services/generatorService').then(({ downloadSqlDdl }) => {
                downloadSqlDdl(curP.id, curP.name).then(() => {
                  toast.success('Esquema DDL SQL exportado directamente.');
                }).catch(() => window.dispatchEvent(new CustomEvent('case_open_sql_modal')));
              });
            } else {
              window.dispatchEvent(new CustomEvent('case_open_sql_modal'));
            }
          } else if (chatMsg.actionType === 'EXPORT_PNG') {
            const curP = useDiagramStore.getState().project;
            const curNodes = useDiagramStore.getState().nodes;
            if (curP?.name && curNodes.length > 0) {
              import('../services/exportService').then(({ exportDiagramPng }) => {
                exportDiagramPng(curNodes, curP.name, { scale: 2, backgroundColor: '#0f1115' }).then(() => {
                  toast.success('Diagrama PNG exportado directamente.');
                });
              });
            }
          } else if (chatMsg.actionType === 'EXPORT_PDF') {
            const curP = useDiagramStore.getState().project;
            const curNodes = useDiagramStore.getState().nodes;
            if (curP?.id && curP.name) {
              import('../services/exportService').then(({ exportDiagramPdf }) => {
                exportDiagramPdf(curP.id, curP.name, curNodes, { includeImage: true, includeDictionary: true, includeRelationships: true }).then(() => {
                  toast.success('Memoria técnica PDF generada directamente.');
                });
              });
            }
          } else if (chatMsg.actionType === 'EXPORT_OPTIONS') {
            // El usuario pidió exportar en chat: muestra el catálogo interactivo sin abrir modales
            toast.success('Catálogo de 6 formatos disponible en el chat.');
          }
        }

        set((state) => {
          const updated = [...state.chatMessages, chatMsg];
          const curCode = get().sessionCode || get().session?.sessionCode;
          persistCollabChat(curCode, updated);
          return {
            chatMessages: updated,
            unreadCount: state.isChatOpen ? 0 : state.unreadCount + 1
          };
        });
        break;
      }

      case 'ROLE_CHANGED': {
        const { participantUserId, role: newRole } = msg.payload || {};
        const { myParticipant } = get();

        set((state) => {
          const updatedParticipants = state.participants.map((p) =>
            p.userId === participantUserId ? { ...p, role: newRole } : p
          );

          if (myParticipant && participantUserId === myParticipant.userId) {
            toast(newRole === 'viewer'
              ? 'El anfitrión ha asignado tu rol a: Solo Lectura (Lector)'
              : 'El anfitrión ha asignado tu rol a: Editor de Diagrama'
            );
            return {
              role: newRole,
              myParticipant: { ...myParticipant, role: newRole },
              participants: updatedParticipants
            };
          }

          return { participants: updatedParticipants };
        });
        break;
      }

      case 'AI_CONFIG_CHANGED': {
        const { provider, selectedModel, endpoint } = msg.payload || {};
        if (provider) {
          useProjectAiStore.getState().updateActiveEngine(provider, selectedModel, endpoint);
          const label = formatAiEngineLabel(provider, selectedModel);
          toast(`Motor de IA del proyecto actualizado a: ${label}`);
        }
        break;
      }
    }
  },

  loadProjectSnapshots: async (projectId: string) => {
    if (!projectId) return;
    set({ isLoadingSnapshots: true });
    try {
      const snapshots = await continuousSessionService.getProjectSnapshots(projectId);
      set({ savedSnapshots: snapshots, isLoadingSnapshots: false });
    } catch (err) {
      console.error('Error al cargar snapshots continuos:', err);
      set({ savedSnapshots: [], isLoadingSnapshots: false });
    }
  },

  suspendAndSaveContinuousSession: async (reason?: string) => {
    const { sessionCode, participants, chatMessages, sessionEvents, myParticipant } = get();
    const diagramStore = useDiagramStore.getState();
    const project = diagramStore.project;
    if (!sessionCode || !project?.id) {
      toast.error('No hay una sesión activa para suspender');
      return false;
    }

    set({ isSuspending: true });
    try {
      const nodes = diagramStore.nodes.map((n) => ({
        id: n.id,
        type: n.type || 'classNode',
        position: n.position,
        data: n.data
      }));
      const edges = diagramStore.edges.map((e) => ({
        id: e.id,
        type: e.type || 'umlEdge',
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        data: e.data
      }));

      const payload: ContinuousSessionSaveRequest = {
        sessionCode,
        projectId: project.id,
        sessionTitle: project.name,
        reason: reason || 'Suspensión por Anfitrión para continuidad en MongoDB Atlas',
        nodes,
        edges,
        chatHistory: chatMessages,
        sessionEvents: sessionEvents || [],
        activeParticipants: participants
      };

      const savedSnapshot = await continuousSessionService.saveContinuousSession(payload);

      // Difundir evento de suspensión a todos los colaboradores
      collabWebSocketService.sendEvent(
        'SESSION_SUSPENDED',
        {
          message: 'El Host ha suspendido la sesión. Podrás reconectarte con el mismo código cuando sea reanudada.',
          code: sessionCode
        },
        {
          id: myParticipant?.userId || 'host',
          name: myParticipant?.fullName || 'Anfitrión',
          color: myParticipant?.cursorColor || '#6366f1'
        }
      );

      sessionStorage.removeItem('case_active_collab_code');
      collabWebSocketService.disconnect();
      set({
        session: null,
        isLive: false,
        sessionCode: null,
        role: null,
        myParticipant: null,
        participants: [],
        locks: {},
        remoteCursors: {},
        isSuspending: false,
        isModalOpen: false
      });

      toast.success(`Sesión suspendida y guardada exitosamente en ${savedSnapshot.persistenceSource || 'MongoDB Atlas'}`);
      return true;
    } catch (err: any) {
      console.error('Error al suspender sesión:', err);
      toast.error(err.response?.data?.message || 'Error al suspender la sesión en MongoDB Atlas');
      set({ isSuspending: false });
      return false;
    }
  },

  resumeContinuousSession: async (sessionCode: string) => {
    set({ isResuming: true });
    try {
      const cleanCode = sessionCode.trim().toUpperCase();
      const resumeData = await continuousSessionService.resumeContinuousSession(cleanCode);

      const diagramStore = useDiagramStore.getState();
      if (resumeData.nodes && resumeData.nodes.length > 0) {
        diagramStore.setNodes(resumeData.nodes);
      }
      if (resumeData.edges) {
        diagramStore.setEdges(resumeData.edges);
      }

      const restoredChat: ChatMessage[] = (resumeData.chatHistory || []).map((m: any) => ({
        id: m.id || `restored-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: m.senderId || 'unknown',
        senderName: m.senderName || 'Participante',
        senderColor: m.senderColor || '#6366f1',
        text: m.text || '',
        timestamp: m.timestamp || Date.now(),
        isAi: Boolean(m.isAi),
        intent: m.intent,
        actionSummary: m.actionSummary,
        requesterName: m.requesterName,
        providerUsed: m.providerUsed,
        actionType: m.actionType
      }));

      const authUser = useAuthStore.getState().user;
      const myPart: Participant = {
        id: authUser?.userId || 'host-part',
        userId: authUser?.userId || 'host-id',
        fullName: authUser?.fullName || 'Arquitecto (Host)',
        dni: authUser?.username || '',
        role: 'host',
        cursorColor: '#6366F1',
        joinedAt: new Date().toISOString()
      };

      set({
        isLive: true,
        sessionCode: cleanCode,
        role: 'host',
        myParticipant: myPart,
        chatMessages: restoredChat,
        sessionEvents: resumeData.sessionEvents || [],
        participants: [myPart],
        locks: {},
        isResuming: false,
        isModalOpen: false
      });

      sessionStorage.setItem('case_active_collab_code', cleanCode);

      await collabWebSocketService.connect(
        cleanCode,
        (msg) => get().handleIncomingMessage(msg),
        () => {
          console.info(`✓ Reanudada y conectada sala WSS: ${cleanCode}`);
        }
      );

      toast.success(`Sesión ${cleanCode} reanudada exitosamente desde ${resumeData.persistenceSource || 'MongoDB Atlas'}`);
      return true;
    } catch (err: any) {
      console.error('Error al reanudar sesión continua:', err);
      toast.error(err.response?.data?.message || 'No se pudo reanudar la sesión');
      set({ isResuming: false });
      return false;
    }
  },

  deleteContinuousSnapshot: async (snapshotId: string) => {
    try {
      await continuousSessionService.deleteSnapshot(snapshotId);
      set((state) => ({
        savedSnapshots: state.savedSnapshots.filter((s) => s.id !== snapshotId)
      }));
      toast.success('Instantánea eliminada de MongoDB Atlas');
    } catch (err: any) {
      console.error('Error al eliminar instantánea:', err);
      toast.error(err.response?.data?.message || 'No se pudo eliminar la instantánea');
    }
  },

  checkAndRestoreActiveCollabSession: async () => {
    const savedCode = sessionStorage.getItem('case_active_collab_code');
    const { isLive } = get();
    if (!savedCode || isLive) return;

    try {
      console.info(`Intentando autoreconexión a sala colaborativa: ${savedCode}`);
      const auth = useAuthStore.getState();
      if (!auth.user && typeof auth.initialize === 'function') {
        auth.initialize();
      }

      const success = await get().joinSession(savedCode);
      if (success) {
        toast.success(`Reconectado a sala ${savedCode}`);
        const wasChatOpen = sessionStorage.getItem('case_collab_chat_open') === 'true';
        if (wasChatOpen) {
          set({ isChatOpen: true });
        }
      } else {
        sessionStorage.removeItem('case_active_collab_code');
      }
    } catch (err) {
      console.warn('No se pudo restaurar la sesión colaborativa previa:', err);
      sessionStorage.removeItem('case_active_collab_code');
    }
  }
}));
