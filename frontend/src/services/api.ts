import axios from 'axios';
import { DiagramProject, ClassNodeData, RelationshipData } from '../types/diagram';
import { AuditQueryParams } from '../types/audit';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:8080') + '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from sessionStorage strictly
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sw1_volatile_session_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('sw1_volatile_session_jwt');
      sessionStorage.removeItem('sw1_volatile_user');
      // If unauthorized, redirect to login if on protected route
      if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: async (credentials: { email: string; password: string }) => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },
  register: async (data: { fullName: string; username: string; email: string; password: string }) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  // User Profile & Preferences (CU01)
  getUserProfile: async () => {
    const res = await apiClient.get('/users/profile');
    return res.data;
  },
  updateProfile: async (data: { fullName: string; username?: string; avatarUrl?: string }) => {
    const res = await apiClient.put('/users/profile', data);
    return res.data;
  },
  updatePreferences: async (data: {
    theme?: 'dark' | 'light';
    grid?: boolean;
    snapToGrid?: boolean;
    autoSaveInterval?: number;
    defaultZoom?: number;
    customSettings?: Record<string, any>;
  }) => {
    const res = await apiClient.put('/users/preferences', data);
    return res.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await apiClient.put('/users/change-password', data);
    return res.data;
  },
  deleteAccount: async () => {
    const res = await apiClient.delete('/users/account');
    return res.data;
  },

  // Projects (CU03)
  getProjects: async (params?: { search?: string; tag?: string }) => {
    const res = await apiClient.get('/projects', { params });
    return res.data;
  },
  getProjectById: async (id: string) => {
    const res = await apiClient.get(`/projects/${id}`);
    return res.data;
  },
  createProject: async (data: Partial<DiagramProject>) => {
    const res = await apiClient.post('/projects', data);
    return res.data;
  },
  updateProject: async (id: string, data: Partial<DiagramProject>) => {
    const res = await apiClient.put(`/projects/${id}`, data);
    return res.data;
  },
  deleteProject: async (id: string) => {
    const res = await apiClient.delete(`/projects/${id}`);
    return res.data;
  },
  getFullDiagram: async (projectId: string) => {
    const res = await apiClient.get(`/projects/${projectId}/full-diagram`);
    return res.data;
  },

  // Class Nodes
  addClassNode: async (projectId: string, node: Partial<ClassNodeData>) => {
    const res = await apiClient.post(`/projects/${projectId}/classes`, node);
    return res.data;
  },
  updateClassNode: async (projectId: string, classId: string, node: Partial<ClassNodeData>) => {
    const res = await apiClient.put(`/projects/${projectId}/classes/${classId}`, node);
    return res.data;
  },
  deleteClassNode: async (projectId: string, classId: string) => {
    const res = await apiClient.delete(`/projects/${projectId}/classes/${classId}`);
    return res.data;
  },

  // Relationships
  addRelationship: async (projectId: string, rel: Partial<RelationshipData>) => {
    const res = await apiClient.post(`/projects/${projectId}/relationships`, rel);
    return res.data;
  },
  updateRelationship: async (projectId: string, relId: string, rel: Partial<RelationshipData>) => {
    const res = await apiClient.put(`/projects/${projectId}/relationships/${relId}`, rel);
    return res.data;
  },
  deleteRelationship: async (projectId: string, relId: string) => {
    const res = await apiClient.delete(`/projects/${projectId}/relationships/${relId}`);
    return res.data;
  },

  // Admin & RBAC (CU02)
  getAdminUsers: async (params?: { search?: string; role?: string; status?: string }) => {
    const res = await apiClient.get('/admin/users', { params });
    return res.data;
  },
  getAdminMetrics: async () => {
    const res = await apiClient.get('/admin/users/metrics');
    return res.data;
  },
  updateUserRole: async (userId: string, role: string) => {
    const res = await apiClient.put(`/admin/users/${userId}/role`, { role });
    return res.data;
  },
  updateUserStatus: async (userId: string, isActive: boolean) => {
    const res = await apiClient.put(`/admin/users/${userId}/status`, { isActive });
    return res.data;
  },

  // Gestión de Proyectos y Espacios de Trabajo (CU03)
  cloneProject: async (id: string, newName?: string) => {
    const res = await apiClient.post(`/projects/${id}/clone`, { newName });
    return res.data;
  },

  // Auditar Bitácora Global y Eventos de Seguridad (CU04)
  getAuditLogs: async (params?: AuditQueryParams) => {
    const res = await apiClient.get('/admin/audit', { params });
    return res.data;
  },
  getAuditMetrics: async () => {
    const res = await apiClient.get('/admin/audit/metrics');
    return res.data;
  },
  exportAuditLogs: async (format: 'csv' | 'json' | 'xlsx' | 'excel', params?: AuditQueryParams) => {
    const res = await apiClient.get('/admin/audit/export', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return res.data;
  },
};
