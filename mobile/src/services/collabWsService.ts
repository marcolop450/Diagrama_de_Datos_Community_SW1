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
  private messageHandler: ((msg: CollabWsMessage) => void) | null = null;
  private onConnectHandler: (() => void) | null = null;
  private onDisconnectHandler: (() => void) | null = null;

  private ensureClient(): Client {
    if (!this.client) {
      const wsUrl = apiConfig.getWsUrl();
      this.client = new Client({
        brokerURL: wsUrl,
        reconnectDelay: 2500,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log('[WS] STOMP Conectado con éxito');
          this.isConnected = true;
          this.subscribeGlobal();
          this.resubscribeRoom();
          if (this.onConnectHandler) {
            this.onConnectHandler();
          }
        },
        onDisconnect: () => {
          console.log('[WS] STOMP Desconectado');
          this.isConnected = false;
          if (this.roomSubscription) {
            try {
              this.roomSubscription.unsubscribe();
            } catch {}
            this.roomSubscription = null;
          }
          if (this.onDisconnectHandler) {
            this.onDisconnectHandler();
          }
        },
        onStompError: (frame) => {
          console.warn('Error STOMP en móvil:', frame.headers['message']);
        },
        onWebSocketClose: () => {
          this.isConnected = false;
        },
      });
      this.client.activate();
    }
    return this.client;
  }

  private subscribeGlobal(): void {
    if (!this.client || !this.isConnected) return;
    if (this.globalSubscription) {
      try {
        this.globalSubscription.unsubscribe();
      } catch {}
      this.globalSubscription = null;
    }

    this.globalSubscription = this.client.subscribe('/topic/global/events', (stompMsg: IMessage) => {
      try {
        const parsed = JSON.parse(stompMsg.body);
        if (parsed.type === 'ROOM_STARTED') {
          const authUser = useMobileAuthStore.getState().user;
          if (!authUser || authUser.userId === parsed.hostId) {
            return;
          }
          if (authUser.role === 'COLABORADOR') {
            if (authUser.architectId && parsed.hostId && authUser.architectId !== parsed.hostId) {
              return;
            }
          }
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

  private resubscribeRoom(): void {
    if (!this.client || !this.isConnected || !this.currentSessionCode || !this.messageHandler) {
      return;
    }

    if (this.roomSubscription) {
      try {
        this.roomSubscription.unsubscribe();
      } catch {}
      this.roomSubscription = null;
    }

    this.roomSubscription = this.client.subscribe(
      `/topic/room/${this.currentSessionCode}`,
      (stompMsg: IMessage) => {
        try {
          const parsed: CollabWsMessage = JSON.parse(stompMsg.body);
          if (this.messageHandler) {
            this.messageHandler(parsed);
          }
        } catch (e) {
          console.warn('Error parseando mensaje colaborativo en móvil:', e);
        }
      }
    );
    console.log(`[WS] Suscripción activa a sala /topic/room/${this.currentSessionCode}`);
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
    this.messageHandler = onMessage;
    this.onConnectHandler = onConnect || null;
    this.onDisconnectHandler = onDisconnect || null;

    this.ensureClient();

    if (this.isConnected) {
      this.resubscribeRoom();
      if (onConnect) onConnect();
    }
  }

  reconnectIfStale(): void {
    const isClientActive = this.client && this.client.active;
    const isClientConnected = this.client && this.client.connected;

    if (!isClientActive || !isClientConnected || !this.isConnected) {
      console.log('[WS] Reanudando cliente STOMP tras segundo plano...');
      if (this.client) {
        try {
          this.client.deactivate();
        } catch {}
        this.client = null;
      }
      this.isConnected = false;
      this.ensureClient();
    } else if (this.currentSessionCode && !this.roomSubscription) {
      this.resubscribeRoom();
    }
  }

  sendMessage(message: any): void {
    if (!this.client || !this.isConnected || !this.currentSessionCode) {
      if (this.currentSessionCode) {
        this.reconnectIfStale();
      }
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
    this.messageHandler = null;
    this.onConnectHandler = null;
    this.onDisconnectHandler = null;
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
