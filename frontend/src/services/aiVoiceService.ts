import { apiClient } from './api';

export interface UmlMutationDto {
  action: 'CREATE_CLASS' | 'ADD_ATTRIBUTES' | 'ADD_METHODS' | 'CREATE_RELATIONSHIP' | 'CREATE_ASSOCIATION' | 'UPDATE_CLASS' | 'DELETE_ELEMENT' | 'DELETE_RELATIONSHIP' | 'DELETE_ATTRIBUTE' | 'DELETE_METHOD' | 'RENAME_CLASS' | 'UPDATE_ATTRIBUTE' | 'BATCH_DOMAIN';
  targetClassName?: string;
  classData?: {
    name: string;
    isAbstract?: boolean;
    stereotype?: string | null;
    attributes?: Array<{
      id?: string;
      name: string;
      type: string;
      visibility?: string;
      isPrimaryKey?: boolean;
      isId?: boolean;
      isNotNull?: boolean;
      isUnique?: boolean;
    }>;
    methods?: Array<{
      id?: string;
      name: string;
      returnType?: string;
      visibility?: string;
      parameters?: Array<{ name: string; type: string }>;
    }>;
  };
  relationshipData?: {
    sourceClass: string;
    targetClass: string;
    type?: 'ASSOCIATION' | 'AGGREGATION' | 'COMPOSITION' | 'GENERALIZATION' | 'DEPENDENCY';
    sourceCardinality?: string;
    targetCardinality?: string;
    label?: string;
    sourceRole?: string;
    targetRole?: string;
  };
  details?: string;
}

export interface VoiceModelingRequest {
  projectId?: string;
  transcript: string;
  currentClasses?: string[];
  currentRelationships?: Array<{
    source: string;
    target: string;
    type: string;
  }>;
  modality?: 'VOICE_SPEECH_PLN' | 'TEXT_COPILOT';
}

export interface VoiceModelingResponse {
  success: boolean;
  intent: string;
  providerUsed: string;
  latencyMs: number;
  message: string;
  mutations: UmlMutationDto[];
}

export interface AiTeamChatRequest {
  prompt: string;
  sessionCode?: string;
  projectId?: string;
  diagramSnapshot?: any;
}

export interface AiTeamResponseDto {
  intent: 'CATCH_UP_SUMMARY' | 'CONSISTENCY_AUDIT' | 'APPLY_REPAIR' | 'THEORY_EXPLANATION' | 'STRUCTURAL_MUTATION' | 'OUT_OF_SCOPE';
  chatResponse: string;
  actionSummary?: string;
  mutations?: UmlMutationDto[];
  requesterName?: string;
}

export const aiVoiceService = {
  async parseVoiceCommand(request: VoiceModelingRequest): Promise<VoiceModelingResponse> {
    const response = await apiClient.post<{ success: boolean; message: string; data: VoiceModelingResponse }>(
      '/ai/voice/parse',
      request
    );
    return response.data.data;
  },

  async sendTeamChat(request: AiTeamChatRequest): Promise<AiTeamResponseDto> {
    const response = await apiClient.post<{ success: boolean; message: string; data: AiTeamResponseDto }>(
      '/ai/team/chat',
      request
    );
    return response.data.data;
  }
};
