import { apiClient } from './api';
import { VoiceModelingResponse } from './aiVoiceService';

export interface DigitizeWhiteboardParams {
  file: File | Blob;
  projectId?: string;
  mergeMode?: boolean;
}

export const aiVisionService = {
  digitizeWhiteboard: async ({
    file,
    projectId,
    mergeMode = false
  }: DigitizeWhiteboardParams): Promise<VoiceModelingResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }
    formData.append('mergeMode', String(mergeMode));

    const response = await apiClient.post<{ success: boolean; message: string; data: VoiceModelingResponse }>(
      '/ai/vision/digitize',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data?.data || (response.data as any);
  }
};