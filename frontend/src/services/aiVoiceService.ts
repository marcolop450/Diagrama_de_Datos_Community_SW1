import { apiClient } from './api';

export interface UmlMutationDto {
  action: 'CREATE_CLASS' | 'ADD_ATTRIBUTES' | 'ADD_METHODS' | 'CREATE_RELATIONSHIP' | 'UPDATE_CLASS' | 'DELETE_ELEMENT' | 'BATCH_DOMAIN';
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

export const aiVoiceService = {
  async parseVoiceCommand(request: VoiceModelingRequest): Promise<VoiceModelingResponse> {
    const response = await apiClient.post<{ success: boolean; message: string; data: VoiceModelingResponse }>(
      '/ai/voice/parse',
      request
    );
    return response.data.data;
  }
};
