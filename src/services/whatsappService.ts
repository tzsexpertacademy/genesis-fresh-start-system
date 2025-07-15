import { InboxMessage } from '../types/whatsapp';

// Service response type
type ServiceResponse<T = any> = {
  status: boolean;
  data: T;
  message?: string;
};

// WhatsApp service exports
export const getConnectionStatus = async (): Promise<ServiceResponse<string>> => {
  return {
    status: true,
    data: 'disconnected'
  };
};

export const logout = async (): Promise<ServiceResponse<boolean>> => {
  return {
    status: true,
    data: true,
    message: 'Logout successful'
  };
};

export const getInboxMessages = async (): Promise<ServiceResponse<InboxMessage[]>> => {
  return {
    status: true,
    data: []
  };
};

export const sendMessage = async (number: string, message: string): Promise<ServiceResponse<boolean>> => {
  console.log(`Sending message to ${number}: ${message}`);
  return {
    status: true,
    data: true,
    message: 'Message sent successfully'
  };
};

export const sendTextMessage = async (number: string, message: string): Promise<ServiceResponse<boolean>> => {
  const result = await sendMessage(number, message);
  return result;
};

export const sendMediaMessage = async (number: string, media: File, caption?: string): Promise<ServiceResponse<boolean>> => {
  console.log(`Sending media to ${number}:`, media.name, caption);
  return {
    status: true,
    data: true,
    message: 'Media sent successfully'
  };
};

export const getQRCode = async (): Promise<ServiceResponse<string>> => {
  return {
    status: true,
    data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  };
};

export const getConfig = async (): Promise<ServiceResponse<any>> => {
  return {
    status: true,
    data: {}
  };
};

export const updateConfig = async (config: any): Promise<ServiceResponse<boolean>> => {
  console.log('Updating config:', config);
  return {
    status: true,
    data: true,
    message: 'Config updated successfully'
  };
};

export const getLogs = async (): Promise<ServiceResponse<string[]>> => {
  return {
    status: true,
    data: ['App initialized', 'WhatsApp service started']
  };
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