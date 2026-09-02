import axios from 'axios';
import { DiagramProject, ClassNodeData, RelationshipData } from '../types/diagram';

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
      if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
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
  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  // Projects
  getProjects: async (ownerId?: string) => {
    const res = await apiClient.get('/projects', { params: { ownerId } });
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
};
