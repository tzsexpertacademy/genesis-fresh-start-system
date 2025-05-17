/**
 * This file is deprecated. WebSocket is now used for real-time notifications instead of SSE.
 *
 * Import the websocketService instead:
 * import websocketService from './websocketService';
 */

import { InboxMessage } from '../types/whatsapp';
import websocketService from './websocketService';

// Define the message event type for backward compatibility
export interface MessageEvent {
  type: string;
  data: {
    hasNewMessages: boolean;
    lastMessageTime: string;
    messageId: string;
    sender: string;
    message: string;
  };
}

// Stub functions for backward compatibility
export const initSSE = () => {
  console.log('SSE is deprecated. Using WebSocket instead.');
  websocketService.connect();
};

export const closeSSE = () => {
  console.log('SSE is deprecated. Using WebSocket instead.');
};

export const isSSEConnected = () => {
  return websocketService.getConnectionStatus() === 'connected';
};

export const resetReconnectAttempts = () => {
  console.log('SSE is deprecated. Using WebSocket instead.');
};
