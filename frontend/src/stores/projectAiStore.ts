import { create } from 'zustand';
import { projectAiService, AiProvider } from '../services/projectAiService';

export const formatAiEngineLabel = (provider?: string, model?: string): string => {
  if (!provider || provider === 'SYSTEM_DEFAULT') {
    return 'Gratuito Integrado';
  }
  if (provider === 'LMSTUDIO_LOCAL') {
    return `LM Studio (${model || 'Local'})`;
  }
  if (provider === 'OLLAMA_LOCAL') {
    return `Ollama (${model || 'Local'})`;
  }
  if (provider === 'GROQ_CLOUD') {
    return `Groq (${model || 'Llama 3.3'})`;
  }
  if (provider === 'GEMINI_API') {
    return `Gemini (${model || 'Flash'})`;
  }
  if (provider === 'OPENROUTER') {
    return `OpenRouter (${model || 'Unified'})`;
  }
  // Generic Cloud BYOK / Meta / OpenAI etc.
  const cleanProv = provider.replace('_CLOUD', '').replace('_API', '');
  return `${cleanProv} (${model || 'BYOK'})`;
};

interface ProjectAiState {
  currentProjectId: string | null;
  activeProvider: AiProvider;
  selectedModel: string;
  endpoint: string;
  activeEngineLabel: string;
  isAiModalOpen: boolean;
  isLoading: boolean;
  openAiModal: () => void;
  closeAiModal: () => void;
  loadProjectAiConfig: (projectId: string) => Promise<void>;
  updateActiveEngine: (provider: AiProvider, model?: string, endpoint?: string) => void;
}

export const useProjectAiStore = create<ProjectAiState>((set) => ({
  currentProjectId: null,
  activeProvider: 'SYSTEM_DEFAULT',
  selectedModel: '',
  endpoint: '',
  activeEngineLabel: 'Gratuito Integrado',
  isAiModalOpen: false,
  isLoading: false,

  openAiModal: () => set({ isAiModalOpen: true }),
  closeAiModal: () => set({ isAiModalOpen: false }),

  loadProjectAiConfig: async (projectId: string) => {
    if (!projectId) return;
    set({ isLoading: true, currentProjectId: projectId });
    try {
      const data = await projectAiService.getProjectAiConfig(projectId);
      const prov = (data.provider || 'SYSTEM_DEFAULT') as AiProvider;
      const model = data.selectedModel || '';
      const endpoint = data.ollamaEndpoint || '';
      const label = formatAiEngineLabel(prov, model);

      set({
        activeProvider: prov,
        selectedModel: model,
        endpoint,
        activeEngineLabel: label,
        isLoading: false
      });
    } catch (err) {
      console.warn('No se pudo cargar la configuración de IA para el proyecto:', projectId, err);
      set({
        activeProvider: 'SYSTEM_DEFAULT',
        selectedModel: '',
        endpoint: '',
        activeEngineLabel: 'Gratuito Integrado',
        isLoading: false
      });
    }
  },

  updateActiveEngine: (provider: AiProvider, model?: string, endpoint?: string) => {
    const label = formatAiEngineLabel(provider, model);
    set({
      activeProvider: provider,
      selectedModel: model || '',
      endpoint: endpoint || '',
      activeEngineLabel: label
    });
  }
}));
