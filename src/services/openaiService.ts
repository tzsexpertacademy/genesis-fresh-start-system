import { stateManager } from '../utils/stateManager';

// Base service for OpenAI interactions
export const openaiService = {
  async sendMessage(message: string): Promise<string> {
    try {
      // Mock response for now
      return `OpenAI Response: ${message}`;
    } catch (error) {
      console.error('OpenAI service error:', error);
      throw error;
    }
  },

  async chat(message: string): Promise<string> {
    return this.sendMessage(message);
  },

  // Configuration methods
  getConfig(): any {
    return stateManager.get('openai_config') || {};
  },

  setConfig(config: any): void {
    stateManager.set('openai_config', config);
  }
};