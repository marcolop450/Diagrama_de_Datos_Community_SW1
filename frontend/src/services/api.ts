import axios from 'axios';
import { DiagramProject } from '../types/diagram';

const API_URL = import.meta.env.VITE_API_URL + '/api';

export const api = axios.create({
  baseURL: API_URL,
});

export const projectService = {
  getProjects: async (): Promise<DiagramProject[]> => {
    const response = await api.get('/projects');
    return response.data;
  },
  createProject: async (data: Partial<DiagramProject>): Promise<DiagramProject> => {
    const response = await api.post('/projects', data);
    return response.data;
  },
  // Add more methods as needed
};
