import { InboxMessage } from '../types/whatsapp';

// WhatsApp service exports
export const getConnectionStatus = async (): Promise<string> => {
  return 'disconnected';
};

export const logout = async (): Promise<boolean> => {
  return true;
};

export const getInboxMessages = async (): Promise<InboxMessage[]> => {
  return [];
};

export const sendMessage = async (number: string, message: string): Promise<boolean> => {
  console.log(`Sending message to ${number}: ${message}`);
  return true;
};

export const sendTextMessage = async (number: string, message: string): Promise<boolean> => {
  return sendMessage(number, message);
};

export const sendMediaMessage = async (number: string, media: File, caption?: string): Promise<boolean> => {
  console.log(`Sending media to ${number}:`, media.name, caption);
  return true;
};

export const getQRCode = async (): Promise<string> => {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
};

export const getConfig = async (): Promise<any> => {
  return {};
};

export const updateConfig = async (config: any): Promise<boolean> => {
  console.log('Updating config:', config);
  return true;
};

export const getLogs = async (): Promise<string[]> => {
  return ['App initialized', 'WhatsApp service started'];
};

// Backward compatibility
export const whatsappService = {
  getConnectionStatus,
  logout,
  getInboxMessages,
  sendMessage,
  sendTextMessage,
  sendMediaMessage,
  getQRCode,
  getConfig,
  updateConfig,
  getLogs
};

// API request helper
export const apiRequest = async (endpoint: string, options: any = {}) => {
  const baseUrl = 'http://localhost:3001/api';
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};