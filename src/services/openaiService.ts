import { apiRequest } from './whatsappService'; // Reusing the apiRequest from whatsappService

interface OpenAIConfigResponse {
  status: boolean;
  message: string;
  data?: {
    config: {
      apiKeySet: boolean;
      model: string;
    };
  };
}

interface OpenAIGenerateResponse {
  status: boolean;
  message: string;
  data?: {
    response: string;
    history: Array<{ role: string; content: string }>;
  };
}

export const getOpenAIConfig = async (): Promise<OpenAIConfigResponse> => {
  return apiRequest('/openai/config');
};

export const generateOpenAIResponse = async (
  prompt: string,
  history: Array<{ role: string; content: string }> = []
): Promise<OpenAIGenerateResponse> => {
  return apiRequest('/openai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, history }),
  });
};