import axios, { AxiosInstance } from 'axios';
import { safeStorage } from './storage';
import { apiConfig } from '../config/apiConfig';
import { ApiResponse, LoginResponseData, UserSession } from '../types/auth';
import { DiagramProjectSummary, FullDiagramPayload } from '../types/diagram';

const TOKEN_KEY = 'case_mobile_jwt_token';
const USER_KEY = 'case_mobile_user_session';

class MobileApiService {
  private getClient(): AxiosInstance {
    const client = axios.create({
      baseURL: apiConfig.getRestBaseUrl(),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    client.interceptors.request.use(async (config) => {
      try {
        const token = await safeStorage.getItem(TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {}
      return config;
    });

    return client;
  }

  async login(credentials: { email: string; password: string }): Promise<LoginResponseData> {
    const client = this.getClient();
    const res = await client.post<ApiResponse<LoginResponseData>>('/auth/login', credentials);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Credenciales inválidas');
    }
    const data = res.data.data;
    try {
      await safeStorage.setItem(TOKEN_KEY, data.token);
      await safeStorage.setItem(USER_KEY, JSON.stringify(data));
    } catch (storageErr) {
      console.warn('Almacenamiento local advertencia:', storageErr);
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await safeStorage.removeItem(TOKEN_KEY);
      await safeStorage.removeItem(USER_KEY);
    } catch {}
  }

  async getStoredSession(): Promise<{ token: string | null; user: UserSession | null }> {
    try {
      const token = await safeStorage.getItem(TOKEN_KEY);
      const userRaw = await safeStorage.getItem(USER_KEY);
      const user = userRaw ? JSON.parse(userRaw) : null;
      return { token, user };
    } catch {
      return { token: null, user: null };
    }
  }

  async getProjects(): Promise<DiagramProjectSummary[]> {
    const client = this.getClient();
    const res = await client.get<ApiResponse<DiagramProjectSummary[]>>('/projects');
    return Array.isArray(res.data.data) ? res.data.data : [];
  }

  async getFullDiagram(projectId: string): Promise<FullDiagramPayload> {
    const client = this.getClient();
    const res = await client.get<ApiResponse<FullDiagramPayload>>(`/projects/${projectId}/full-diagram`);
    return res.data.data;
  }

  async getContinuousSnapshots(projectId: string): Promise<any[]> {
    try {
      const client = this.getClient();
      const res = await client.get<ApiResponse<any[]>>(`/sessions/continuous/project/${projectId}`);
      return Array.isArray(res.data.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  async joinCollabSession(sessionCode: string, dni: string, fullName: string): Promise<any> {
    const client = this.getClient();
    const cleanCode = sessionCode.trim().toUpperCase();
    const res = await client.post<ApiResponse<any>>('/collaboration/join', {
      sessionCode: cleanCode,
      dni: dni || 'GUEST',
      fullName: fullName || 'Observador Móvil',
    });
    return res.data.data;
  }

  async registerPushToken(payload: { pushToken: string; platform?: string; deviceName?: string }): Promise<ApiResponse<any>> {
    const client = this.getClient();
    const res = await client.post<ApiResponse<any>>('/notifications/push-token', payload);
    return res.data;
  }

  async sendTestPush(payload: { pushToken?: string; title?: string; body?: string; notificationType?: string }): Promise<ApiResponse<any>> {
    const client = this.getClient();
    const res = await client.post<ApiResponse<any>>('/notifications/test-push', payload);
    return res.data;
  }

  async deactivatePushToken(token: string): Promise<ApiResponse<any>> {
    const client = this.getClient();
    const res = await client.delete<ApiResponse<any>>(`/notifications/push-token?token=${encodeURIComponent(token)}`);
    return res.data;
  }
}

export const mobileApi = new MobileApiService();
