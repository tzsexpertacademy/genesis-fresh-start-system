import { apiRequest } from './whatsappService'; // Reusing the apiRequest from whatsappService

interface GroqConfigResponse {
  status: boolean;
  message: string;
  data?: {
    config: {
      apiKeySet: boolean;
      model: string;
    };
  };
}

interface GroqGenerateResponse {
  status: boolean;
  message: string;
  data?: {
    response: string;
    history: Array<{ role: string; content: string }>;
  };
}

export const getGroqConfig = async (): Promise<GroqConfigResponse> => {
  return apiRequest('/groq/config');
};

export const generateGroqResponse = async (
  prompt: string,
  history: Array<{ role: string; content: string }> = []
): Promise<GroqGenerateResponse> => {
  return apiRequest('/groq/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, history }),
  });
};