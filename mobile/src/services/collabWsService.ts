import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { apiConfig } from '../config/apiConfig';
import { CollabWsMessage } from '../types/collab';
import { pushNotificationService } from './pushNotificationService';

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
