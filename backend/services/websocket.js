import WebSocket, { WebSocketServer } from 'ws';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.join(__dirname, '..');
const inboxFile = path.join(dataDir, 'inbox.json');
const flagFile = path.join(dataDir, 'new_messages_flag.json');

// WebSocket server instance
let wss = null;

// Connected clients
const clients = new Set();

// Initialize WebSocket server
export const initWebSocket = (server) => {
  // Create WebSocket server with path to avoid CORS issues
  wss = new WebSocketServer({
    server,
    path: '/api'
  });

  console.log('WebSocket server initialized with path /api');

  // Handle connection
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Add client to set
    clients.add(ws);

    // Send initial data
    sendInitialData(ws);

    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(ws, data);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Set up ping-pong to keep connection alive
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Set up interval to check for dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
};

// Send initial data to client
const sendInitialData = async (ws) => {
  try {
    // Read inbox data
    const inbox = await fs.readJson(inboxFile, { throws: false }) || [];

    // Send inbox data
    ws.send(JSON.stringify({
      type: 'inbox_data',
      data: inbox
    }));

    // Send connection status
    ws.send(JSON.stringify({
      type: 'connection_status',
      data: global.whatsappConnectionStatus || 'disconnected'
    }));
  } catch (error) {
    console.error('Error sending initial data:', error);
  }
};

// Handle messages from client
const handleClientMessage = (ws, data) => {
  switch (data.type) {
    case 'request_inbox':
      sendInboxData(ws);
      break;
    case 'request_status':
      sendConnectionStatus(ws);
      break;
    case 'ping':
      // Respond with pong to keep connection alive
      ws.send(JSON.stringify({
        type: 'pong',
        data: { timestamp: Date.now() }
      }));
      break;
    case 'pong':
      // Mark client as alive
      ws.isAlive = true;
      break;
    default:
      console.log('Unknown message type:', data.type);
  }
};

// Send inbox data to client
const sendInboxData = async (ws) => {
  try {
    const inbox = await fs.readJson(inboxFile, { throws: false }) || [];
    ws.send(JSON.stringify({
      type: 'inbox_data',
      data: inbox
    }));
  } catch (error) {
    console.error('Error sending inbox data:', error);
  }
};

// Send connection status to client
const sendConnectionStatus = (ws) => {
  ws.send(JSON.stringify({
    type: 'connection_status',
    data: global.whatsappConnectionStatus || 'disconnected'
  }));
};

// Broadcast message to all connected clients
export const broadcastMessage = (type, data) => {
  if (!wss) return;

  const message = JSON.stringify({ type, data });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Broadcast new message to all connected clients with improved real-time handling
export const broadcastNewMessage = (message) => {
  // Ensure the message has a timestamp
  if (!message.timestamp) {
    message.timestamp = new Date().toISOString();
  }

  // First, immediately update the inbox.json file to ensure consistency
  try {
    // Read current inbox
    const inbox = fs.readJsonSync(inboxFile, { throws: false }) || [];

    // Check if message already exists to prevent duplicates
    if (!inbox.some(msg => msg.id === message.id)) {
      // Add new message
      inbox.push(message);

      // Write back to file
      fs.writeJsonSync(inboxFile, inbox, { spaces: 2 });
      console.log('Inbox file updated with new message:', message.id);
    }
  } catch (error) {
    console.error('Error updating inbox file with new message:', error);
  }

  // Broadcast to all clients with high priority
  console.log('Broadcasting new message with high priority:', message.id);

  // Create a direct message event specifically for active chats
  const directMessageEvent = {
    type: 'direct_message',
    data: {
      message,
      timestamp: new Date().toISOString(),
      priority: 'high'
    }
  };

  // Send the direct message event to all clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(directMessageEvent));
    }
  });

  // Send multiple times to ensure delivery (with slight delays)
  broadcastMessage('new_message', message);

  // Send again after a short delay to ensure it's received
  setTimeout(() => {
    broadcastMessage('new_message', message);
  }, 100);

  // And once more for good measure
  setTimeout(() => {
    broadcastMessage('new_message', message);
  }, 500);

  // Also send a specific active_chat_update event
  setTimeout(() => {
    broadcastMessage('active_chat_update', message);
  }, 50);

  // Send a force_refresh_chat event to ensure active chats are updated
  // Extract the phone number from the sender
  let phoneNumber = null;
  if (message && message.sender && typeof message.sender === 'string' && message.sender.includes('@s.whatsapp.net')) {
    phoneNumber = message.sender.replace('@s.whatsapp.net', '');
  } else if (message && message.recipient && typeof message.recipient === 'string') {
    // For outgoing messages
    phoneNumber = message.recipient;
  }

  if (phoneNumber) {
    setTimeout(() => {
      broadcastMessage('force_refresh_chat', {
        phoneNumber,
        timestamp: new Date().toISOString()
      });
    }, 200);
  }

  // Also update the flag file for backward compatibility
  try {
    const messageTime = message.timestamp || new Date().toISOString();
    fs.writeJsonSync(flagFile, {
      hasNewMessages: true,
      lastMessageTime: messageTime,
      messageId: message.id
    }, { spaces: 2 });
  } catch (error) {
    console.error('Error updating flag file:', error);
  }
};

// Broadcast connection status to all connected clients
export const broadcastConnectionStatus = (status) => {
  // Store status globally for new connections
  global.whatsappConnectionStatus = status;

  broadcastMessage('connection_status', status);
};

// Export WebSocket server
export default {
  initWebSocket,
  broadcastMessage,
  broadcastNewMessage,
  broadcastConnectionStatus
};
