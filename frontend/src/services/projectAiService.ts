import { apiClient } from './api';
import { UmlMutationDto } from './aiVoiceService';

export type AiProvider = 
  | 'SYSTEM_DEFAULT' 
  | 'LMSTUDIO_LOCAL' 
  | 'OLLAMA_LOCAL' 
  | 'GROQ_CLOUD' 
  | 'GEMINI_API' 
  | 'OPENROUTER' 
  | 'OPENAI';

export interface ProjectAiConfigDto {
  id?: string;
  projectId: string;
  provider: AiProvider;
  ollamaEndpoint?: string;
  selectedModel?: string;
  apiKey?: string;
  maskedApiKey?: string;
  hasCustomApiKey?: boolean;
  temperature?: number;
  maxTokens?: number;
  isActive?: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'SUCCESS' | 'FAILED' | string;
  lastTestLatencyMs?: number;
}

export interface ProjectAiTestRequest {
  provider: AiProvider;
  ollamaEndpoint?: string;
  selectedModel?: string;
  apiKey?: string;
  temperature?: number;
  testPrompt?: string;
}

export interface ProjectAiTestResponse {
  success: boolean;
  httpStatusCode: number;
  latencyMs: number;
  providerUsed: string;
  modelUsed?: string;
  rawResponse?: string;
  parsedMutations?: UmlMutationDto[];
  errorMessage?: string;
  isUmlValid: boolean;
}

export interface OllamaModelsResponse {
  success: boolean;
  endpoint?: string;
  models: string[];
  errorMessage?: string;
}

export const projectAiService = {
  async getProjectAiConfig(projectId: string): Promise<ProjectAiConfigDto> {
    const res = await apiClient.get<{ success: boolean; message: string; data: ProjectAiConfigDto }>(
      `/projects/${projectId}/ai-config`
    );
    return res.data.data;
  },

  async saveProjectAiConfig(projectId: string, config: ProjectAiConfigDto): Promise<ProjectAiConfigDto> {
    const res = await apiClient.put<{ success: boolean; message: string; data: ProjectAiConfigDto }>(
      `/projects/${projectId}/ai-config`,
      config
    );
    return res.data.data;
  },

  async testAiConnection(projectId: string, request: ProjectAiTestRequest): Promise<ProjectAiTestResponse> {
    const res = await apiClient.post<{ success: boolean; message: string; data: ProjectAiTestResponse }>(
      `/projects/${projectId}/ai-config/test`,
      request
    );
    return res.data.data;
  },

  async detectOllamaModels(projectId: string, endpoint: string): Promise<OllamaModelsResponse> {
    const res = await apiClient.post<{ success: boolean; message: string; data: OllamaModelsResponse }>(
      `/projects/${projectId}/ai-config/detect-ollama`,
      { endpoint }
    );
    return res.data.data;
  },

  async detectLocalModels(
    projectId: string, 
    serverType: 'LMSTUDIO' | 'OLLAMA', 
    endpoint: string
  ): Promise<OllamaModelsResponse> {
    const res = await apiClient.post<{ success: boolean; message: string; data: OllamaModelsResponse }>(
      `/projects/${projectId}/ai-config/detect-local`,
      { serverType, endpoint }
    );
    return res.data.data;
  },

  async discoverExternalModels(
    projectId: string,
    provider: string,
    endpoint?: string,
    apiKey?: string
  ): Promise<OllamaModelsResponse> {
    const res = await apiClient.post<{ success: boolean; message: string; data: OllamaModelsResponse }>(
      `/projects/${projectId}/ai-config/discover-external-models`,
      { provider, ollamaEndpoint: endpoint, apiKey }
    );
    return res.data.data;
  }
};
