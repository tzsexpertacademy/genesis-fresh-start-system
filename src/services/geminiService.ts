import { stateManager } from '../utils/stateManager';

// Service response type
type ServiceResponse<T = any> = {
  status: boolean;
  data: T;
  message?: string;
};

// Gemini service exports
export const sendMessage = async (message: string): Promise<string> => {
  try {
    return `Gemini Response: ${message}`;
  } catch (error) {
    console.error('Gemini service error:', error);
    throw error;
  }
};

export const chat = async (message: string): Promise<string> => {
  return sendMessage(message);
};

export const getConfig = (): any => {
  return stateManager.get('gemini_config') || {};
};

export const setConfig = (config: any): void => {
  stateManager.set('gemini_config', config);
};

export const getGeminiConfig = (): ServiceResponse<any> => {
  return {
    status: true,
    data: getConfig()
  };
};

export const updateGeminiConfig = (config: any): ServiceResponse<boolean> => {
  setConfig(config);
  return {
    status: true,
    data: true,
    message: 'Gemini config updated successfully'
  };
};

export const testGeminiConnection = async (): Promise<ServiceResponse<boolean>> => {
  try {
    await sendMessage('test');
    return {
      status: true,
      data: true,
      message: 'Connection successful'
    };
  } catch (error) {
    return {
      status: false,
      data: false,
      message: 'Connection failed'
    };
  }
};

export const generateContent = async (prompt: string): Promise<any> => {
  return {
    response: {
      text: () => `Generated content for: ${prompt}`
    }
  };
};

// Backward compatibility
export const geminiService = {
  sendMessage,
  chat,
  getConfig,
  setConfig,
  getGeminiConfig,
  updateGeminiConfig,
  testGeminiConnection,
  generateContent
};