import { Client, IMessage } from '@stomp/stompjs';

export interface CollabMessage<T = any> {
  type:
    | 'JOIN'
    | 'LEAVE'
    | 'NODE_MOVE'
    | 'NODE_UPDATE'
    | 'NODE_CREATE'
    | 'NODE_DELETE'
    | 'EDGE_CREATE'
    | 'EDGE_UPDATE'
    | 'EDGE_DELETE'
    | 'CURSOR'
    | 'LOCK'
    | 'UNLOCK'
    | 'SESSION_ENDED'
    | 'SYNC_STATE'
    | 'SAVE_SYNC'
    | 'KICK'
    | 'CHAT'
    | 'ROLE_CHANGED'
    | 'STANDBY_STATE';
  senderId?: string;
  senderName?: string;
  senderColor?: string;
  sessionCode?: string;
  payload?: T;
  timestamp?: number;
}

class CollabWebSocketService {
  private client: Client | null = null;
  private currentSessionCode: string | null = null;
  private subscription: any = null;

  private getWsUrl(): string {
    const rawApi = import.meta.env?.VITE_API_URL || 'http://localhost:8080';
    let wsUrl = rawApi.replace(/^http/, 'ws');
    if (!wsUrl.endsWith('/ws-case')) {
      wsUrl = wsUrl.replace(/\/api\/?$/, '') + '/ws-case';
    }
    return wsUrl;
  }

  public connect(
    sessionCode: string,
    onMessage: (message: CollabMessage) => void,
    onConnect?: () => void,
    onError?: (error: any) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      this.disconnect();
      this.currentSessionCode = sessionCode;

      const brokerUrl = this.getWsUrl();

      this.client = new Client({
        brokerURL: brokerUrl,
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          // Suscribirse al tópico de la sala
          this.subscription = this.client?.subscribe(
            `/topic/room/${sessionCode}`,
            (stompMessage: IMessage) => {
              try {
                const parsed: CollabMessage = JSON.parse(stompMessage.body);
                onMessage(parsed);
              } catch (e) {
                console.error('Error parseando mensaje colaborativo STOMP:', e);
              }
            }
          );

          if (onConnect) onConnect();
          resolve();
        },
        onStompError: (frame) => {
          console.error('Error STOMP en WebSocket:', frame.headers['message'], frame.body);
          if (onError) onError(frame);
        },
        onWebSocketError: (event) => {
          console.error('Error de conexión WebSocket:', event);
          if (onError) onError(event);
        }
      });

      this.client.activate();
    });
  }

  public sendEvent(type: CollabMessage['type'], payload: any, senderInfo: { id: string; name: string; color: string }) {
    if (!this.client || !this.client.connected || !this.currentSessionCode) {
      return;
    }

    const message: CollabMessage = {
      type,
      senderId: senderInfo.id,
      senderName: senderInfo.name,
      senderColor: senderInfo.color,
      sessionCode: this.currentSessionCode,
      payload,
      timestamp: Date.now()
    };

    this.client.publish({
      destination: `/app/room/${this.currentSessionCode}/event`,
      body: JSON.stringify(message)
    });
  }

  public sendMessage(message: CollabMessage) {
    if (!this.client || !this.client.connected || !this.currentSessionCode) {
      return;
    }
    this.client.publish({
      destination: `/app/room/${this.currentSessionCode}/event`,
      body: JSON.stringify(message)
    });
  }

  public sendCursor(x: number, y: number, senderInfo: { id: string; name: string; color: string }) {
    this.sendEvent('CURSOR', { x, y }, senderInfo);
  }

  public sendLock(elementId: string, senderInfo: { id: string; name: string; color: string }) {
    this.sendEvent('LOCK', { elementId }, senderInfo);
  }

  public sendUnlock(elementId: string, senderInfo: { id: string; name: string; color: string }) {
    this.sendEvent('UNLOCK', { elementId }, senderInfo);
  }

  public disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.currentSessionCode = null;
  }

  public isConnected(): boolean {
    return !!(this.client && this.client.connected);
  }
}

export const collabWebSocketService = new CollabWebSocketService();
