export type CollabEventType =
  | 'JOIN'
  | 'LEAVE'
  | 'NODE_MOVE'
  | 'NODE_UPDATE'
  | 'NODE_CREATE'
  | 'NODE_DELETE'
  | 'EDGE_CREATE'
  | 'EDGE_UPDATE'
  | 'EDGE_DELETE'
  | 'LOCK'
  | 'UNLOCK'
  | 'SESSION_ENDED'
  | 'SESSION_SUSPENDED'
  | 'SAVE_SYNC'
  | 'SYNC_STATE'
  | 'CURSOR'
  | 'KICK'
  | 'ROLE_CHANGED'
  | 'CHAT';

export interface CollabWsMessage<T = any> {
  type: CollabEventType;
  senderId?: string;
  senderName?: string;
  senderColor?: string;
  sessionCode?: string;
  payload?: T;
  timestamp?: number;
}

export interface CollabParticipant {
  id: string;
  userId: string;
  fullName: string;
  role: 'host' | 'editor' | 'viewer' | string;
  cursorColor?: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: number;
}

export interface CollabChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: number;
  isAi?: boolean;
  intent?: string;
  actionSummary?: string;
  requesterName?: string;
  providerUsed?: string;
}
