import { InboxMessage, Contact } from '../../types/whatsapp';

// Minimal WhatsApp service
export const whatsappService = {
  getInboxMessages: async (): Promise<InboxMessage[]> => {
    return [];
  },
  
  sendMessage: async (number: string, message: string): Promise<boolean> => {
    console.log(`Sending message to ${number}: ${message}`);
    return true;
  },

  getConnectionStatus: async (): Promise<string> => {
    return 'disconnected';
  }
};