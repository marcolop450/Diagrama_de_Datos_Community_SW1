import { create } from 'zustand';
import toast from 'react-hot-toast';
import { collabService, CollaborationSessionData, Participant, ElementLock } from '../services/collabService';
import { collabWebSocketService, CollabMessage } from '../services/collabWebSocketService';
import { useDiagramStore } from './diagramStore';
import { useAuthStore } from './authStore';

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
}

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

  // Acciones de difusión en tiempo real
  broadcastNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  broadcastNodeUpdate: (nodeId: string, nodeData: any) => void;
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
  isChatOpen: false,
  isLoading: false,
  isModalOpen: false,

  setModalOpen: (open: boolean) => set({ isModalOpen: open }),
  toggleChat: () => set((state) => ({ 
    isChatOpen: !state.isChatOpen, 
    unreadCount: !state.isChatOpen ? 0 : state.unreadCount 
  })),

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

      set({
        session: sessionData,
        isLive: true,
        sessionCode: sessionData.sessionCode,
        role: 'host',
        myParticipant: myPart,
        participants: sessionData.participants,
        locks: initialLocks,
        isLoading: false,
        isModalOpen: true
      });

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
      const authUser = useAuthStore.getState().user;
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

      set({
        session: sessionData,
        isLive: true,
        sessionCode: sessionData.sessionCode,
        role: (myPart.role as any) || 'editor',
        myParticipant: myPart,
        participants: sessionData.participants,
        locks: initialLocks,
        chatMessages: [],
        unreadCount: 0,
        isLoading: false
      });

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

  sendChatMessage: (text: string) => {
    const { sessionCode, myParticipant } = get();
    if (!sessionCode || !myParticipant || !text.trim()) return;

    const chatPayload = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: text.trim()
    };

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
      text: text.trim(),
      timestamp: Date.now()
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, localMsg]
    }));
  },

  leaveSession: async () => {
    const { sessionCode, isLive } = get();
    if (!isLive || !sessionCode) return;

    try {
      await collabService.leaveSession(sessionCode);
    } catch (e) {
      console.warn('Salida de sala colaborativa:', e);
    } finally {
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

  broadcastNodeMove: (nodeId: string, position: { x: number; y: number }) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'NODE_MOVE',
      { nodeId, position },
      { id: myParticipant.userId, name: myParticipant.fullName, color: myParticipant.cursorColor }
    );
  },

  broadcastNodeUpdate: (nodeId: string, nodeData: any) => {
    const { isLive, myParticipant } = get();
    if (!isLive || !myParticipant) return;

    collabWebSocketService.sendEvent(
      'NODE_UPDATE',
      { nodeId, nodeData },
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
        const { nodeId, position } = msg.payload || {};
        if (nodeId && position) {
          diagramStore.setNodes((nodes: any[]) =>
            nodes.map((n: any) => (n.id === nodeId ? { ...n, position } : n))
          );
        }
        break;
      }

      case 'NODE_UPDATE': {
        const { nodeId, nodeData } = msg.payload || {};
        if (nodeId && nodeData) {
          diagramStore.setNodes((nodes: any[]) =>
            nodes.map((n: any) => (n.id === nodeId ? { ...n, data: { ...n.data, ...nodeData } } : n))
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
        const { nodes, edges } = msg.payload || {};
        if (Array.isArray(nodes) && Array.isArray(edges)) {
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

      case 'SESSION_ENDED': {
        const { role } = get();
        toast.error('La sesión colaborativa ha sido finalizada por el anfitrión.', { id: 'collab-session-ended' });
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
          timestamp: msg.timestamp || Date.now()
        };
        set((state) => ({
          chatMessages: [...state.chatMessages, chatMsg],
          unreadCount: state.isChatOpen ? 0 : state.unreadCount + 1
        }));
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
    }
  }
}));
