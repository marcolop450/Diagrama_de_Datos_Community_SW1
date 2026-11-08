import { apiClient } from './api';

export interface ContinuousSessionSaveRequest {
  sessionCode: string;
  projectId: string;
  sessionTitle?: string;
  reason?: string;
  nodes: any[];
  edges: any[];
  chatHistory: any[];
  sessionEvents: any[];
  activeParticipants: any[];
}

export interface ContinuousSessionSnapshotDto {
  id: string;
  sessionCode: string;
  projectId: string;
  sessionTitle: string;
  savedByUserId: string;
  savedByUserName: string;
  createdAt: string;
  reason: string;
  status: string;
  classesCount: number;
  relationshipsCount: number;
  messagesCount: number;
  eventsCount: number;
  participantsCount: number;
  persistenceSource: string;
}

export interface ContinuousSessionResumeResponse {
  snapshot: ContinuousSessionSnapshotDto;
  nodes: any[];
  edges: any[];
  chatHistory: any[];
  sessionEvents: any[];
  activeParticipants: any[];
  resumedAt: string;
  message: string;
  persistenceSource: string;
}

export const continuousSessionService = {
  /**
   * Suspender y guardar sesión continua en MongoDB Atlas (o fallback PostgreSQL).
   */
  async saveContinuousSession(
    request: ContinuousSessionSaveRequest
  ): Promise<ContinuousSessionSnapshotDto> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: ContinuousSessionSnapshotDto;
    }>('/sessions/continuous/save', request);
    return response.data.data;
  },

  /**
   * Obtener lista de instantáneas continuas de un proyecto guardadas en MongoDB Atlas.
   */
  async getProjectSnapshots(
    projectId: string
  ): Promise<ContinuousSessionSnapshotDto[]> {
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: ContinuousSessionSnapshotDto[];
    }>(`/sessions/continuous/project/${projectId}`);
    return response.data.data;
  },

  /**
   * Reanudar una sesión continua desde MongoDB Atlas con el estado exacto de canvas, chat y eventos.
   */
  async resumeContinuousSession(
    sessionCode: string
  ): Promise<ContinuousSessionResumeResponse> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: ContinuousSessionResumeResponse;
    }>(`/sessions/continuous/resume/${sessionCode}`);
    return response.data.data;
  },

  /**
   * Eliminar una instantánea continua persistida.
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await apiClient.delete(`/sessions/continuous/${snapshotId}`);
  }
};
