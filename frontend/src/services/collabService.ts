import { apiClient } from './api';

export interface Participant {
  id: string;
  userId: string;
  fullName: string;
  dni: string;
  role: 'host' | 'editor' | 'viewer';
  cursorColor: string;
  joinedAt: string;
}

export interface ElementLock {
  elementId: string;
  lockedBy: string;
  lockedByName: string;
  cursorColor?: string;
  expiresAt: string;
}

export interface CollaborationSessionData {
  sessionId: string;
  sessionCode: string;
  projectId: string;
  projectName: string;
  hostId: string;
  hostName: string;
  status: 'active' | 'paused' | 'ended';
  startedAt: string;
  endedAt?: string;
  participants: Participant[];
  locks: ElementLock[];
  initialDiagram?: any;
  token?: string;
  userSession?: any;
}

export const collabService = {
  async startSession(projectId: string): Promise<CollaborationSessionData> {
    const res = await apiClient.post<{ success: boolean; data: CollaborationSessionData }>(
      '/collaboration/start',
      { projectId }
    );
    return res.data.data;
  },

  async joinSession(sessionCode: string, dni?: string, fullName?: string): Promise<CollaborationSessionData> {
    const res = await apiClient.post<{ success: boolean; data: CollaborationSessionData }>(
      '/collaboration/join',
      { sessionCode, dni: dni || '', fullName: fullName || '' }
    );
    return res.data.data;
  },

  async endSession(sessionCode: string): Promise<void> {
    await apiClient.post(`/collaboration/${sessionCode}/end`);
  },

  async kickParticipant(sessionCode: string, participantUserId: string): Promise<void> {
    await apiClient.post(`/collaboration/${sessionCode}/kick/${participantUserId}`);
  },

  async updateParticipantRole(sessionCode: string, participantUserId: string, role: 'editor' | 'viewer'): Promise<void> {
    await apiClient.post(`/collaboration/${sessionCode}/role/${participantUserId}?role=${role}`);
  },

  async leaveSession(sessionCode: string): Promise<void> {
    await apiClient.post(`/collaboration/${sessionCode}/leave`);
  },

  async toggleGuestAccess(sessionCode: string, allowGuests: boolean): Promise<void> {
    await apiClient.post(`/collaboration/${sessionCode}/access?allowGuests=${allowGuests}`);
  },

  async getSessionStatus(sessionCode: string): Promise<CollaborationSessionData> {
    const res = await apiClient.get<{ success: boolean; data: CollaborationSessionData }>(
      `/collaboration/${sessionCode}/status`
    );
    return res.data.data;
  }
};
