import { stateManager } from '../utils/stateManager';

// Base service for Groq interactions
export const groqService = {
  async sendMessage(message: string): Promise<string> {
    try {
      // Mock response for now
      return `Groq Response: ${message}`;
    } catch (error) {
      console.error('Groq service error:', error);
      throw error;
    }
  },

  async chat(message: string): Promise<string> {
    return this.sendMessage(message);
  },

  // Configuration methods
  getConfig(): any {
    return stateManager.get('groq_config') || {};
  },

  setConfig(config: any): void {
    stateManager.set('groq_config', config);
  }
};