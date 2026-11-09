import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { apiConfig } from '../config/apiConfig';
import { CollabWsMessage } from '../types/collab';
import { pushNotificationService } from './pushNotificationService';
import { useMobileAuthStore } from '../stores/authStore';

class MobileCollabWsService {
  private client: Client | null = null;
  private currentSessionCode: string | null = null;
  private roomSubscription: StompSubscription | null = null;
  private globalSubscription: StompSubscription | null = null;
  private isConnected = false;

  private ensureClient(onConnectCallback?: () => void): Client {
    if (!this.client) {
      const wsUrl = apiConfig.getWsUrl();
      this.client = new Client({
        brokerURL: wsUrl,
        reconnectDelay: 4000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          this.isConnected = true;
          this.subscribeGlobal();
          if (onConnectCallback) onConnectCallback();
        },
        onDisconnect: () => {
          this.isConnected = false;
        },
        onStompError: (frame) => {
          console.warn('Error STOMP en móvil:', frame.headers['message']);
        },
      });
      this.client.activate();
    }
    return this.client;
  }

  private subscribeGlobal(): void {
    if (!this.client || !this.isConnected) return;
    if (this.globalSubscription) return;

    this.globalSubscription = this.client.subscribe('/topic/global/events', (stompMsg: IMessage) => {
      try {
        const parsed = JSON.parse(stompMsg.body);
        if (parsed.type === 'ROOM_STARTED') {
          const authUser = useMobileAuthStore.getState().user;
          // Si el usuario móvil no está autenticado o es el propio anfitrión que abrió la sala, no notificar
          if (!authUser || authUser.userId === parsed.hostId) {
            return;
          }
          // Si es colaborador, sólo notificar si pertenece al arquitecto anfitrión
          if (authUser.role === 'COLABORADOR') {
            if (authUser.architectId && parsed.hostId && authUser.architectId !== parsed.hostId) {
              return; // Es de otro arquitecto, no mostrar notificación
            }
          }
          // Si es arquitecto pero no es el anfitrión, no notificar sobre proyectos ajenos
          if (authUser.role === 'ARQUITECTO' && authUser.userId !== parsed.hostId) {
            return;
          }

          pushNotificationService.triggerLocalNotification(
            'Sala en Vivo Iniciada',
            `${parsed.hostName || 'El Arquitecto'} abrió la sala ${parsed.sessionCode} para ${parsed.projectName}. Toca para unirte.`,
            { sessionCode: parsed.sessionCode, projectId: parsed.projectId, action: 'JOIN_ROOM' }
          );
        }
      } catch (e) {
        console.warn('Error parseando evento global en móvil:', e);
      }
    });
  }

  connectGlobal(): void {
    this.ensureClient();
    if (this.isConnected) {
      this.subscribeGlobal();
    }
  }

  connect(
    sessionCode: string,
    onMessage: (msg: CollabWsMessage) => void,
    onConnect?: () => void,
    onDisconnect?: () => void
  ): void {
    const cleanCode = sessionCode.trim().toUpperCase();
    this.currentSessionCode = cleanCode;

    if (this.roomSubscription) {
      try {
        this.roomSubscription.unsubscribe();
      } catch {}
      this.roomSubscription = null;
    }

    const onConnected = () => {
      this.isConnected = true;
      this.subscribeGlobal();

      if (this.currentSessionCode) {
        this.roomSubscription = this.client?.subscribe(
          `/topic/room/${this.currentSessionCode}`,
          (stompMsg: IMessage) => {
            try {
              const parsed: CollabWsMessage = JSON.parse(stompMsg.body);
              onMessage(parsed);
            } catch (e) {
              console.warn('Error parseando mensaje colaborativo en móvil:', e);
            }
          }
        ) || null;
      }

      if (onConnect) onConnect();
    };

    if (this.client && this.isConnected) {
      onConnected();
    } else {
      this.ensureClient(onConnected);
    }
  }

  sendMessage(message: any): void {
    if (!this.client || !this.isConnected || !this.currentSessionCode) {
      return;
    }
    this.client.publish({
      destination: `/app/room/${this.currentSessionCode}/event`,
      body: JSON.stringify(message),
    });
  }

  disconnect(): void {
    if (this.roomSubscription) {
      try {
        this.roomSubscription.unsubscribe();
      } catch {}
      this.roomSubscription = null;
    }
    this.currentSessionCode = null;
  }

  disconnectAll(): void {
    this.disconnect();
    if (this.globalSubscription) {
      try {
        this.globalSubscription.unsubscribe();
      } catch {}
      this.globalSubscription = null;
    }
    if (this.client) {
      try {
        this.client.deactivate();
      } catch {}
      this.client = null;
    }
    this.isConnected = false;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const mobileCollabWs = new MobileCollabWsService();
