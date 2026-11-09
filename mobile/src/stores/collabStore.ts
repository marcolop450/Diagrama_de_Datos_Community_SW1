import { create } from 'zustand';
import { mobileCollabWs } from '../services/collabWsService';
import { mobileApi } from '../services/api';
import { pushNotificationService } from '../services/pushNotificationService';
import { useMobileProjectStore } from './projectStore';
import { useMobileAuthStore } from './authStore';
import { CollabParticipant, CollabWsMessage, InAppNotification, CollabChatMessage } from '../types/collab';

interface MobileCollabState {
  sessionCode: string | null;
  isLive: boolean;
  participants: CollabParticipant[];
  activeLocks: Record<string, string>; // elementId -> lockHolderName
  notifications: InAppNotification[];
  chatMessages: CollabChatMessage[];
  unreadChatCount: number;
  isChatOpen: boolean;
  error: string | null;

  joinSession: (code: string, dni?: string, fullName?: string) => Promise<boolean>;
  leaveSession: () => void;
  toggleChat: () => void;
  sendChatMessage: (text: string) => void;
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'alert') => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  handleIncomingMessage: (msg: CollabWsMessage) => void;
}

export const useMobileCollabStore = create<MobileCollabState>((set, get) => ({
  sessionCode: null,
  isLive: false,
  participants: [],
  activeLocks: {},
  notifications: [],
  chatMessages: [],
  unreadChatCount: 0,
  isChatOpen: false,
  error: null,

  addNotification: (title: string, message: string, type = 'info') => {
    // Evitar notificaciones duplicadas en un lapso de 4 segundos
    const currentNotifs = get().notifications;
    const isDuplicate = currentNotifs.some(
      (n) => n.title === title && (n.message === message || Date.now() - n.timestamp < 3500)
    );
    if (isDuplicate) return;

    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: InAppNotification = { id, title, message, type, timestamp: Date.now() };
    set({
      // Mantener estrictamente 1 alerta visible para evitar saturación de pantalla
      notifications: [newNotif],
    });

    // Auto-eliminar ágil tras 2.5 segundos
    setTimeout(() => {
      get().removeNotification(id);
    }, 2500);
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearNotifications: () => set({ notifications: [] }),

  toggleChat: () => {
    set((state) => ({
      isChatOpen: !state.isChatOpen,
      unreadChatCount: !state.isChatOpen ? 0 : state.unreadChatCount,
    }));
  },

  sendChatMessage: (text: string) => {
    const { sessionCode, isLive } = get();
    const cleanText = text.trim();
    if (!cleanText || !isLive || !sessionCode) return;

    const authUser = useMobileAuthStore.getState().user;
    const senderId = authUser?.userId || 'mobile-collab';
    const senderName = authUser?.fullName || 'Observador Móvil';

    const isAiMention = cleanText.toLowerCase().includes('@ai');
    const chatPayload: any = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: cleanText,
    };

    if (isAiMention) {
      const { nodes, edges } = useMobileProjectStore.getState();
      chatPayload.diagramSnapshot = {
        nodes: nodes.map((n) => ({
          id: n.id,
          position: n.position,
          data: {
            name: n.data.name,
            attributes: n.data.attributes,
            methods: n.data.methods,
            isAbstract: n.data.isAbstract,
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          data: {
            type: e.type,
            sourceCardinality: e.sourceCardinality,
            targetCardinality: e.targetCardinality,
            label: e.label,
          },
        })),
      };
    }

    const wsMsg = {
      type: 'CHAT',
      senderId,
      senderName,
      senderColor: '#38BDF8',
      sessionCode,
      payload: chatPayload,
      timestamp: Date.now(),
    };

    mobileCollabWs.sendMessage(wsMsg);

    const localMsg: CollabChatMessage = {
      id: chatPayload.id,
      senderId,
      senderName,
      senderColor: '#38BDF8',
      text: cleanText,
      timestamp: Date.now(),
      isAi: false,
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, localMsg],
    }));
  },

  joinSession: async (code: string, dni = 'GUEST', fullName = 'Observador Móvil') => {
    try {
      set({ error: null });
      const cleanCode = code.trim().toUpperCase();

      // 1. Unirse vía REST para validar existencia de sala
      const sessionData = await mobileApi.joinCollabSession(cleanCode, dni, fullName);

      // Si la sala incluye diagrama inicial, cargarlo en projectStore de forma atómica antes de montar el lienzo
      if (sessionData && sessionData.projectId) {
        await useMobileProjectStore.getState().openProject(sessionData.projectId);
      }

      const initialLocks: Record<string, string> = {};
      if (Array.isArray(sessionData.locks)) {
        sessionData.locks.forEach((l: any) => {
          initialLocks[l.elementId] = l.holderName || 'Usuario';
        });
      }

      set({
        sessionCode: cleanCode,
        isLive: true,
        participants: sessionData.participants || [],
        activeLocks: initialLocks,
      });

      // 2. Conectar al WebSocket STOMP nativo
      mobileCollabWs.connect(
        cleanCode,
        (msg) => get().handleIncomingMessage(msg),
        () => {
          get().addNotification(
            'Conexión en Vivo',
            `Sincronizado con sala ${cleanCode}.`,
            'success'
          );
        },
        () => {
          get().addNotification('Desconexión', 'Se interrumpió el enlace en vivo.', 'warning');
        }
      );

      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || 'Error al conectar a sala' });
      get().addNotification('Fallo de Conexión', 'Código de sala inválido o finalizada.', 'alert');
      return false;
    }
  },

  leaveSession: () => {
    const { sessionCode } = get();
    const authUser = useMobileAuthStore.getState().user;
    if (sessionCode) {
      try {
        mobileCollabWs.sendMessage({
          type: 'LEAVE',
          senderId: authUser?.userId || 'guest-observer',
          senderName: authUser?.fullName || 'Observador Móvil',
          sessionCode,
          timestamp: Date.now(),
        });
      } catch {}
    }
    mobileCollabWs.disconnect();
    set({
      sessionCode: null,
      isLive: false,
      participants: [],
      activeLocks: {},
      chatMessages: [],
      unreadChatCount: 0,
      isChatOpen: false,
    });
  },

  handleIncomingMessage: (msg: CollabWsMessage) => {
    const projectStore = useMobileProjectStore.getState();
    const payload = msg.payload || {};

    switch (msg.type) {
      case 'NODE_MOVE': {
        const nodeId = payload.nodeId || payload.id;
        const position = payload.position;
        const className = payload.className;
        if (nodeId && position) {
          projectStore.applyNodeMove(nodeId, position, className);
        }
        break;
      }

      case 'NODE_UPDATE': {
        const nodeId = payload.nodeId || payload.id;
        const nodeData = payload.nodeData || payload.data;
        const className = payload.className;
        if (nodeId && nodeData) {
          projectStore.applyNodeUpdate(nodeId, nodeData, className);
        }
        break;
      }

      case 'NODE_CREATE': {
        const node = payload.node || payload;
        if (node) {
          projectStore.applyNodeCreate(node);
          const className = node.name || node.data?.name || 'Nueva Clase';
          const sessionCode = get().sessionCode || 'Sala';
          get().addNotification(
            'Nueva Clase Añadida',
            `Se añadió '${className}' al modelo.`,
            'info'
          );
          pushNotificationService.triggerLocalNotification(
            'Nueva Clase en el Modelo UML',
            `Se agregó la clase '${className}' en la sala ${sessionCode}.`,
            { action: 'NODE_CREATE', className }
          );
        }
        break;
      }

      case 'NODE_DELETE': {
        const nodeId = payload.nodeId || payload.id;
        if (nodeId) {
          projectStore.applyNodeDelete(nodeId);
          const sessionCode = get().sessionCode || 'Sala';
          get().addNotification(
            'Clase Eliminada',
            'Se removió una entidad del lienzo UML.',
            'warning'
          );
          pushNotificationService.triggerLocalNotification(
            'Clase Eliminada del Modelo',
            `Se eliminó una entidad en la sala colaborativa ${sessionCode}.`,
            { action: 'NODE_DELETE', nodeId }
          );
        }
        break;
      }

      case 'EDGE_CREATE': {
        const edge = payload.edge || payload;
        if (edge) {
          projectStore.applyEdgeCreate(edge);
          get().addNotification(
            'Nueva Relación UML',
            'Se conectaron clases en el modelo.',
            'info'
          );
          pushNotificationService.triggerLocalNotification(
            'Nueva Relación Conectada',
            `Se conectaron entidades en la sala ${get().sessionCode || 'activa'}.`,
            { action: 'EDGE_CREATE' }
          );
        }
        break;
      }

      case 'EDGE_UPDATE': {
        const edgeId = payload.edgeId || payload.id;
        const edgeData = payload.edgeData || payload.data;
        if (edgeId && edgeData) {
          projectStore.applyEdgeUpdate(edgeId, edgeData);
        }
        break;
      }

      case 'EDGE_DELETE': {
        const edgeId = payload.edgeId || payload.id;
        if (edgeId) {
          projectStore.applyEdgeDelete(edgeId);
          get().addNotification(
            'Relación Eliminada',
            'Se desconectaron entidades en el modelo.',
            'warning'
          );
        }
        break;
      }

      case 'SAVE_SYNC':
      case 'SYNC_STATE': {
        const { nodes, edges } = msg.payload || {};
        if (Array.isArray(nodes) && Array.isArray(edges)) {
          projectStore.applySyncState(nodes, edges);
        } else if (projectStore.currentProject?.id) {
          projectStore.openProject(projectStore.currentProject.id);
        }
        if (msg.type === 'SAVE_SYNC') {
          get().addNotification(
            'Modelo Guardado',
            'Cambios sincronizados en PostgreSQL 17.',
            'success'
          );
          pushNotificationService.triggerLocalNotification(
            'Modelo Actualizado en la Nube',
            'Cambios sincronizados exitosamente en PostgreSQL 17.',
            { action: 'SAVE_SYNC' }
          );
        }
        break;
      }

      case 'CHAT': {
        const rawPayload = msg.payload || {};
        const chatMsg: CollabChatMessage = {
          id: rawPayload.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          senderId: msg.senderId || 'unknown',
          senderName: msg.senderName || 'Colaborador',
          senderColor: msg.senderColor || '#38BDF8',
          text: rawPayload.text || '',
          timestamp: msg.timestamp || Date.now(),
          isAi: rawPayload.isAi || msg.senderId === '00000000-0000-0000-0000-000000000000',
          intent: rawPayload.intent,
          actionSummary: rawPayload.actionSummary,
          requesterName: rawPayload.requesterName,
          providerUsed: rawPayload.providerUsed,
        };

        const authUser = useMobileAuthStore.getState().user;
        const isFromMe = (authUser && msg.senderId === authUser.userId) || 
          msg.senderName === 'Observador Móvil' || 
          msg.senderName === 'Tú';

        if (!get().isChatOpen && !isFromMe) {
          pushNotificationService.triggerLocalNotification(
            chatMsg.isAi ? 'Respuesta del Asistente IA' : `Mensaje de ${chatMsg.senderName}`,
            chatMsg.text.substring(0, 100),
            { action: 'CHAT', sessionCode: get().sessionCode }
          );
        }

        set((state) => {
          if (state.chatMessages.some((m) => m.id === chatMsg.id)) {
            return state;
          }
          return {
            chatMessages: [...state.chatMessages, chatMsg],
            unreadChatCount: state.isChatOpen ? 0 : state.unreadChatCount + 1,
          };
        });
        break;
      }

      case 'LOCK': {
        const { elementId, holderName } = msg.payload || {};
        if (elementId) {
          set((state) => ({
            activeLocks: { ...state.activeLocks, [elementId]: holderName || 'Colaborador' },
          }));
        }
        break;
      }

      case 'UNLOCK': {
        const { elementId } = msg.payload || {};
        if (elementId) {
          set((state) => {
            const copy = { ...state.activeLocks };
            delete copy[elementId];
            return { activeLocks: copy };
          });
        }
        break;
      }

      case 'SESSION_SUSPENDED': {
        get().addNotification(
          'Sesión Suspendida',
          'El Host suspendió la sesión y guardó en MongoDB Atlas.',
          'warning'
        );
        pushNotificationService.triggerLocalNotification(
          'Sesión de Pizarra Suspendida',
          'El Host suspendió la sesión y guardó la instantánea en MongoDB Atlas.',
          { action: 'SESSION_SUSPENDED' }
        );
        break;
      }

      case 'SESSION_ENDED': {
        get().leaveSession();
        get().addNotification('Sala Cerrada', 'El anfitrión ha finalizado la sesión.', 'alert');
        break;
      }

      default:
        break;
    }
  },
}));
