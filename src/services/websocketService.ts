// WebSocket service for real-time communication with the backend
import { InboxMessage } from '../types/whatsapp';
import { messageSyncService } from './messageSyncService';

// Event types
type EventCallback = (data: any) => void;
type EventType = 'connection_status' | 'new_message' | 'inbox_data' | 'error' | 'open' | 'close' | 'direct_message' | 'active_chat_update' | 'force_refresh_chat';

// WebSocket connection status
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 3000; // 3 seconds
  private heartbeatInterval = 30000; // 30 seconds
  private events: Map<EventType, EventCallback[]> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private messageQueue: any[] = [];
  private isConnecting = false;

  // Initialize WebSocket connection
  public connect(url: string = this.getWebSocketUrl()): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.setConnectionStatus('connecting');

    try {
      console.log(`Connecting to WebSocket at ${url}`);
      this.socket = new WebSocket(url);

      // Connection opened
      this.socket.onopen = (event) => {
        console.log('WebSocket connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.setConnectionStatus('connected');
        this.emit('open', event);

        // Send any queued messages
        this.flushMessageQueue();

        // Start heartbeat to keep connection alive
        this.startHeartbeat();

        // Request status immediately after connection
        this.requestStatus();
      };

      // Connection closed
      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed', event);
        this.isConnecting = false;
        this.setConnectionStatus('disconnected');
        this.emit('close', event);

        // Stop heartbeat
        this.stopHeartbeat();

        // Try to reconnect
        this.reconnect();
      };

      // Connection error
      this.socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        this.isConnecting = false;
        this.setConnectionStatus('error');
        this.emit('error', event);

        // Stop heartbeat
        this.stopHeartbeat();
      };

      // Listen for messages with enhanced handling for active chat updates
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            // Log the received message for debugging
            console.log(`WebSocket: Received message of type ${data.type}`, data.data);

            // Handle ping/pong messages for connection keepalive
            if (data.type === 'ping') {
              // Respond with pong to keep connection alive
              this.send('pong', { timestamp: Date.now() });
              return;
            } else if (data.type === 'pong') {
              // Received pong response from server
              console.log('Received pong from server');
              return;
            }

            // Emit the event directly
            this.emit(data.type as EventType, data.data);

            // For new messages, also emit an active_chat_update event with higher priority
            if (data.type === 'new_message') {
              console.log('WebSocket: Received new message, emitting active_chat_update with high priority');

              // Validate message
              if (!data.data || !data.data.id) {
                console.error('WebSocket: Invalid message data', data.data);
                return;
              }

              // Store the message in sessionStorage for immediate access
              // This ensures the message is available even if the component is re-rendered
              try {
                const messageKey = `ws_message_${data.data.id}`;
                sessionStorage.setItem(messageKey, JSON.stringify({
                  message: data.data,
                  timestamp: Date.now()
                }));
              } catch (err) {
                console.error('Error storing message in sessionStorage:', err);
              }

              // Add message to sync service for consistent state management
              // This is the key to fixing the issue with messages not appearing after navigation
              messageSyncService.addMessage(data.data);

              // Emit an active_chat_update event for immediate UI updates
              // Do this multiple times with slight delays to ensure delivery
              this.emit('active_chat_update', data.data);

              // Send again after a short delay to ensure it's received
              setTimeout(() => {
                this.emit('active_chat_update', data.data);
              }, 50);

              // And once more for good measure
              setTimeout(() => {
                this.emit('active_chat_update', data.data);
              }, 200);

              // Also request a refresh of the inbox data with a delay
              // This ensures the UI is consistent with the backend
              setTimeout(() => {
                this.requestInbox();
              }, 1000);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.setConnectionStatus('error');
      this.reconnect();
    }
  }

  // Reconnect to WebSocket
  private reconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts, 5);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    // Clear any existing heartbeat
    this.stopHeartbeat();

    // Set up new heartbeat
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('Sending heartbeat ping');
        // Send a ping message to keep the connection alive
        this.send('ping', { timestamp: Date.now() });
      } else {
        console.log('Heartbeat: WebSocket not open, attempting to reconnect');
        this.stopHeartbeat();
        this.reconnect();
      }
    }, this.heartbeatInterval);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Close WebSocket connection
  public disconnect(): void {
    // Stop heartbeat
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Send message to server
  public send(type: string, data: any): void {
    const message = JSON.stringify({ type, data });

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      // Queue message to send when connection is established
      this.messageQueue.push(message);

      // If not connected or connecting, try to connect
      if (!this.socket || (this.socket.readyState !== WebSocket.CONNECTING && !this.isConnecting)) {
        this.connect();
      }
    }
  }

  // Send queued messages
  private flushMessageQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.send(message);
      }
    }
  }

  // Register event listener
  public on(event: EventType, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event)?.push(callback);
  }

  // Remove event listener
  public off(event: EventType, callback: EventCallback): void {
    if (!this.events.has(event)) {
      return;
    }

    const callbacks = this.events.get(event) || [];
    this.events.set(event, callbacks.filter(cb => cb !== callback));
  }

  // Emit event
  private emit(event: EventType, data: any): void {
    if (!this.events.has(event)) {
      return;
    }

    const callbacks = this.events.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }

  // Get WebSocket URL
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');

    // Use a relative WebSocket URL that will be proxied by Vite
    // This avoids CORS issues by using the same origin
    return `${protocol}//${window.location.hostname}:${port}/api`;
  }

  // Get current connection status
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  // Set connection status and emit event
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.emit('connection_status', status);
  }

  // Request inbox data from server
  public requestInbox(): void {
    this.send('request_inbox', {});
  }

  // Request connection status from server
  public requestStatus(): void {
    this.send('request_status', {});
  }

  // Process a new message directly (for immediate UI updates)
  public processNewMessage(message: InboxMessage): void {
    if (!message || !message.id) {
      console.error('WebSocketService: Invalid message', message);
      return;
    }

    console.log('WebSocketService: Processing new message directly', message);

    // Store the message in sessionStorage for immediate access
    try {
      const messageKey = `ws_message_${message.id}`;
      sessionStorage.setItem(messageKey, JSON.stringify({
        message,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Error storing message in sessionStorage:', err);
    }

    // Add message to sync service for consistent state management
    messageSyncService.addMessage(message);

    // Emit the new_message event
    this.emit('new_message', message);

    // Also emit an active_chat_update event specifically for updating the active chat
    // Do this multiple times with slight delays to ensure delivery
    this.emit('active_chat_update', message);

    // Send again after a short delay to ensure it's received
    setTimeout(() => {
      this.emit('active_chat_update', message);
    }, 50);

    // And once more for good measure
    setTimeout(() => {
      this.emit('active_chat_update', message);
    }, 200);
  }

  // Update active chat with a new message (for immediate UI updates)
  public updateActiveChat(message: InboxMessage, phoneNumber: string): void {
    if (!message || !message.id) {
      console.error('WebSocketService: Invalid message', message);
      return;
    }

    if (!phoneNumber) {
      console.error('WebSocketService: Invalid phone number', phoneNumber);
      return;
    }

    console.log(`WebSocketService: Updating active chat for ${phoneNumber} with message:`, message);

    // Store the message in sessionStorage for immediate access
    try {
      const messageKey = `ws_message_${message.id}_${phoneNumber}`;
      sessionStorage.setItem(messageKey, JSON.stringify({
        message,
        phoneNumber,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Error storing message in sessionStorage:', err);
    }

    // Add message to sync service for consistent state management
    // This ensures the message is available even after navigation
    messageSyncService.addMessage(message);

    // Create a payload with the message and phone number
    const payload = {
      message,
      phoneNumber
    };

    // Emit an event specifically for the active chat
    // Do this multiple times with slight delays to ensure delivery
    this.emit('active_chat_update', payload);

    // Send again after a short delay to ensure it's received
    setTimeout(() => {
      this.emit('active_chat_update', payload);
    }, 50);

    // And once more for good measure
    setTimeout(() => {
      this.emit('active_chat_update', payload);
    }, 200);
  }

  // Check for pending messages in sessionStorage
  public checkPendingMessages(): InboxMessage[] {
    const pendingMessages: InboxMessage[] = [];

    try {
      // Look for messages stored in sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('ws_message_')) {
          const storedData = sessionStorage.getItem(key);
          if (storedData) {
            const data = JSON.parse(storedData);

            // Only include messages from the last 5 minutes
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (data.timestamp && data.timestamp > fiveMinutesAgo) {
              if (data.message) {
                pendingMessages.push(data.message);
              }
            } else {
              // Remove old messages
              sessionStorage.removeItem(key);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking pending messages in sessionStorage:', err);
    }

    return pendingMessages;
  }

  // Force refresh of active chat - this is a new method to ensure real-time updates
  public forceRefreshActiveChat(phoneNumber: string): void {
    if (!phoneNumber) {
      console.error('Phone number is required to force refresh active chat');
      return;
    }

    console.log(`WebSocketService: Forcing refresh of active chat for ${phoneNumber}`);

    // Create a special event to force a refresh of the active chat
    const refreshEvent = {
      type: 'force_refresh_chat',
      phoneNumber,
      timestamp: new Date().toISOString()
    };

    // Store in sessionStorage for immediate access
    try {
      const refreshKey = `force_refresh_${phoneNumber}_${Date.now()}`;
      sessionStorage.setItem(refreshKey, JSON.stringify(refreshEvent));
    } catch (err) {
      console.error('Error storing refresh event in sessionStorage:', err);
    }

    // Emit a special event to force a refresh
    this.emit('force_refresh_chat', {
      phoneNumber,
      timestamp: new Date().toISOString()
    });

    // Also emit a regular active_chat_update event for backward compatibility
    this.emit('active_chat_update', {
      forceRefresh: true,
      phoneNumber,
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
