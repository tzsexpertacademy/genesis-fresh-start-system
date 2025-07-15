import { stateManager } from '../utils/stateManager';

// Service response type
type ServiceResponse<T = any> = {
  status: boolean;
  data: T;
  message?: string;
};

// OpenAI service exports
export const sendMessage = async (message: string): Promise<string> => {
  try {
    return `OpenAI Response: ${message}`;
  } catch (error) {
    console.error('OpenAI service error:', error);
    throw error;
  }
};

export const chat = async (message: string): Promise<string> => {
  return sendMessage(message);
};

export const generateOpenAIResponse = async (message: string): Promise<ServiceResponse<string>> => {
  const response = await sendMessage(message);
  return {
    status: true,
    data: response,
    message: 'Response generated successfully'
  };
};

export const getConfig = (): any => {
  return stateManager.get('openai_config') || {};
};

export const setConfig = (config: any): void => {
  stateManager.set('openai_config', config);
};

// Backward compatibility
export const openaiService = {
  sendMessage,
  chat,
  generateOpenAIResponse,
  getConfig,
  setConfig
};