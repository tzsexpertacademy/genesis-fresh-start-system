import { stateManager } from '../utils/stateManager';

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

export const getGeminiConfig = (): any => {
  return getConfig();
};

export const updateGeminiConfig = (config: any): void => {
  setConfig(config);
};

export const testGeminiConnection = async (): Promise<boolean> => {
  try {
    await sendMessage('test');
    return true;
  } catch (error) {
    return false;
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