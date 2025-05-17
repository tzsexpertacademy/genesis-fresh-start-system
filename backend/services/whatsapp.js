import * as baileys from 'baileys';
import qrcode from 'qrcode';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { Boom } from '@hapi/boom';
import { logActivity } from '../utils/logger.js';
import { getConfig } from '../config.js';
import { processMessage as processGeminiMessage } from './gemini.js';

const { makeWASocket, DisconnectReason, useMultiFileAuthState } = baileys;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.join(__dirname, '..');
fs.ensureDirSync(dataDir);

// Session directory
const sessionsDir = path.join(dataDir, 'sessions');
fs.ensureDirSync(sessionsDir);

// Inbox file
const inboxFile = path.join(dataDir, 'inbox.json');
if (!fs.existsSync(inboxFile)) {
  fs.writeJsonSync(inboxFile, [], { spaces: 2 });
}

// Flag file for new messages - keeping for backward compatibility
const flagFile = path.join(dataDir, 'new_messages_flag.json');
if (!fs.existsSync(flagFile)) {
  fs.writeJsonSync(flagFile, {
    hasNewMessages: false,
    lastMessageTime: new Date().toISOString(),
    messageId: ''
  }, { spaces: 2 });
}

// Import WebSocket service for real-time notifications
import { broadcastNewMessage, broadcastConnectionStatus } from './websocket.js';

// WhatsApp client
let waSocket = null;
let qrString = null;
let connectionStatus = 'disconnected';

// Initialize WhatsApp client
export const initWhatsApp = async () => {
  try {
    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);

    // Create WhatsApp socket with more reliable options
    waSocket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ['WhatsApp Gateway', 'Chrome', '1.0.0'],
      connectTimeoutMs: 180000, // Increased timeout to 3 minutes
      keepAliveIntervalMs: 30000, // Less frequent keepalive to reduce overhead
      defaultQueryTimeoutMs: 180000, // Increased timeout to 3 minutes
      emitOwnEvents: false,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      retryRequestDelayMs: 1000, // Slightly slower retry to reduce server load
      transactionOpts: {
        maxCommitRetries: 15, // More retries for transactions
        delayBetweenTriesMs: 5000 // Longer delay between retries
      },
      shouldIgnoreJid: jid => false, // Don't ignore any JIDs
      getMessage: async () => undefined, // Don't try to fetch messages from store
      patchMessageBeforeSending: msg => {
        // Patch messages to ensure they don't time out
        const requiresPatch = !!(msg.messageStubParameters || msg.messageStubType);
        if (requiresPatch) {
          msg.messageStubParameters = msg.messageStubParameters || [];
          msg.messageStubType = msg.messageStubType || 0;
        }
        return msg;
      }
    });

    // Handle connection updates
    waSocket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log('Connection update:', update);

      if (qr) {
        // Generate QR code as base64 image
        qrString = await qrcode.toDataURL(qr);
        connectionStatus = 'connecting';
        console.log('QR code generated');

        // Broadcast connection status via WebSocket
        broadcastConnectionStatus('connecting');
      }

      if (connection === 'close') {
        // Get the status code from the error
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || 'Unknown error';

        // Only consider it a permanent logout if explicitly logged out or device removed
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isDeviceRemoved = lastDisconnect?.error?.data?.content?.[0]?.attrs?.type === 'device_removed';
        const isConnectionReplaced = statusCode === DisconnectReason.connectionReplaced;
        const isBadSession = statusCode === DisconnectReason.badSession;
        const isConnectionClosed = statusCode === DisconnectReason.connectionClosed;
        const isConnectionLost = statusCode === DisconnectReason.connectionLost;
        const isTimedOut = errorMessage.includes('Timed Out') || statusCode === 408;

        // Determine if we should reconnect
        const permanentDisconnect = isLoggedOut || isDeviceRemoved;
        const temporaryDisconnect = isConnectionClosed || isConnectionLost || isTimedOut;
        const shouldReconnect = !permanentDisconnect;

        console.log('Connection closed due to:', errorMessage);
        console.log('Status code:', statusCode);
        console.log('Connection details:', {
          isLoggedOut,
          isDeviceRemoved,
          isConnectionReplaced,
          isBadSession,
          isConnectionClosed,
          isConnectionLost,
          isTimedOut
        });
        console.log('Should reconnect:', shouldReconnect);

        // Clear any existing keep-alive interval
        if (global.keepAliveInterval) {
          clearInterval(global.keepAliveInterval);
          global.keepAliveInterval = null;
        }

        connectionStatus = 'disconnected';

        // Broadcast disconnected status via WebSocket
        broadcastConnectionStatus('disconnected');

        if (shouldReconnect) {
          // Different reconnection strategies based on the type of disconnection
          let reconnectDelay = 5000; // Default 5 seconds

          if (isBadSession) {
            console.log('Bad session detected, clearing session before reconnecting');
            try {
              await fs.emptyDir(sessionsDir);
            } catch (e) {
              console.error('Error clearing session:', e);
            }
            reconnectDelay = 2000; // Faster reconnect for bad session
          } else if (isConnectionReplaced) {
            console.log('Connection replaced, waiting longer before reconnecting');
            reconnectDelay = 10000; // Longer delay for connection replaced
          } else if (temporaryDisconnect) {
            console.log('Temporary disconnection detected, reconnecting soon');
            reconnectDelay = 3000; // Shorter delay for temporary issues
          }

          console.log(`Reconnecting after ${reconnectDelay}ms delay...`);

          // Add a delay before reconnecting to avoid rapid reconnection attempts
          setTimeout(() => {
            // Only try to reconnect if still disconnected
            if (connectionStatus === 'disconnected') {
              console.log('Executing reconnection...');
              initWhatsApp().catch(e => {
                console.error('Reconnection failed:', e);
              });
            } else {
              console.log('Reconnection cancelled: already connected');
            }
          }, reconnectDelay);
        } else {
          console.log('Disconnected permanently');
          // Only clear session if explicitly logged out
          if (isLoggedOut || isDeviceRemoved) {
            console.log('Clearing session due to logout or device removal');
            await fs.emptyDir(sessionsDir);
          }
        }
      } else if (connection === 'open') {
        console.log('Connected to WhatsApp');
        connectionStatus = 'connected';
        qrString = null;

        // Broadcast connected status via WebSocket
        broadcastConnectionStatus('connected');

        // Set up a periodic ping to keep the connection alive
        if (global.keepAliveInterval) {
          clearInterval(global.keepAliveInterval);
          global.keepAliveInterval = null;
        }

        if (global.pingFailCount) {
          global.pingFailCount = 0;
        }

        // Use a more reliable keep-alive mechanism
        global.keepAliveInterval = setInterval(async () => {
          if (waSocket && connectionStatus === 'connected') {
            try {
              // First check if we're still connected before sending ping
              const isConnected = waSocket.ws.readyState === waSocket.ws.OPEN;

              if (!isConnected) {
                console.log('WebSocket not connected, skipping keep-alive ping');
                return;
              }

              console.log('Sending keep-alive ping...');

              // Use a simpler presence update instead of a query
              // This is less likely to time out
              await waSocket.sendPresenceUpdate('available');

              // Reset fail count on success
              global.pingFailCount = 0;

              console.log('Keep-alive ping successful');
            } catch (err) {
              // Track consecutive failures
              global.pingFailCount = (global.pingFailCount || 0) + 1;
              console.log(`Keep-alive ping failed (attempt ${global.pingFailCount}):`, err);

              // If we've failed too many times in a row, try to reconnect
              if (global.pingFailCount >= 3) {
                console.log('Too many consecutive ping failures, attempting to reconnect...');

                // Clear the interval to avoid multiple reconnection attempts
                if (global.keepAliveInterval) {
                  clearInterval(global.keepAliveInterval);
                  global.keepAliveInterval = null;
                }

                // Set status to disconnected to trigger reconnection logic
                connectionStatus = 'disconnected';

                // Try to reconnect
                setTimeout(() => {
                  if (connectionStatus === 'disconnected') {
                    console.log('Attempting to reconnect after ping failures...');
                    initWhatsApp().catch(e => {
                      console.error('Failed to reconnect after ping failures:', e);
                    });
                  }
                }, 5000);
              }
            }
          }
        }, 45000); // Every 45 seconds - less frequent to reduce overhead
      }
    });

    // Handle messages with improved real-time notification
    waSocket.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];

      if (!msg.key.fromMe && m.type === 'notify') {
        const sender = msg.key.remoteJid;
        const messageContent = msg.message?.conversation ||
                              msg.message?.extendedTextMessage?.text ||
                              'Media message';

        console.log(`New message from ${sender}: ${messageContent}`);

        // Log message
        logActivity('received', sender, messageContent);

        // Create message object with timestamp first to ensure consistency
        const messageTime = new Date().toISOString();
        const messageObject = {
          id: msg.key.id,
          sender,
          message: messageContent,
          timestamp: messageTime,
          read: false
        };

        // We'll let broadcastNewMessage handle updating the inbox.json file
        // This ensures a single source of truth and prevents race conditions

        // Set a flag in the flag file to indicate new messages (for backward compatibility)
        // This will be used by the frontend to trigger a refresh
        fs.writeJsonSync(flagFile, {
          hasNewMessages: true,
          lastMessageTime: messageTime,
          messageId: msg.key.id
        }, { spaces: 2 });

        // Message object already created above

        // Send real-time notification via WebSocket
        console.log('Broadcasting new message via WebSocket:', {
          sender,
          messageId: msg.key.id,
          messageTime
        });

        try {
          // Broadcast via WebSocket
          broadcastNewMessage(messageObject);

          console.log('Real-time notifications sent successfully');
        } catch (error) {
          console.error('Error sending real-time notifications:', error);
        }

        // Try with Gemini for AI requests
        console.log('Attempting to process message with Gemini...');
        try {
          // FORCE PROCESS ALL MESSAGES with Gemini for testing
          console.log('FORCE PROCESSING ALL MESSAGES with Gemini for testing');

          // Process message with Gemini
          const geminiResponse = await processGeminiMessage(messageContent);
          console.log('Gemini processing result:', geminiResponse ? 'Response received' : 'No response');

          if (geminiResponse) {
            console.log('Sending Gemini response back to WhatsApp...');
            await sendTextMessage(sender, geminiResponse);
            logActivity('ai_response_gemini', sender, geminiResponse);
            console.log('Gemini response sent successfully');
            return; // Skip regular auto-reply if Gemini responded
          } else {
            console.log('No response from Gemini, falling back to regular auto-reply');
            // For testing, send a default response if Gemini fails
            const defaultResponse = 'Maaf, Gemini tidak dapat memproses pesan Anda saat ini. Ini adalah pesan default.';
            await sendTextMessage(sender, defaultResponse);
            logActivity('ai_response_default', sender, defaultResponse);
            console.log('Default response sent successfully');
            return; // Skip regular auto-reply after sending default response
          }
        } catch (geminiError) {
          console.error('Error processing message with Gemini:', geminiError);
          console.error('Error details:', geminiError.stack);

          // For testing, send an error response
          const errorResponse = 'Maaf, terjadi kesalahan saat memproses pesan Anda dengan Gemini. Silakan coba lagi nanti.';
          await sendTextMessage(sender, errorResponse);
          logActivity('ai_response_error', sender, errorResponse);
          console.log('Error response sent successfully');
          return; // Skip regular auto-reply after sending error response
        }

        // Regular auto-reply if enabled
        const config = getConfig();
        if (config.autoReply && config.autoReply.enabled) {
          console.log('Sending regular auto-reply message');
          await sendTextMessage(sender, config.autoReply.message);
        }
      }
    });

    // Save credentials on update
    waSocket.ev.on('creds.update', saveCreds);

    return waSocket;
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    connectionStatus = 'disconnected';
    throw error;
  }
};

// Get QR code
export const getQRCode = async () => {
  // If we already have a QR code, return it
  if (qrString) {
    return qrString;
  }

  // If we're already connected, no need for QR code
  if (connectionStatus === 'connected') {
    return null;
  }

  // If we're disconnected, try to initialize WhatsApp to get a QR code
  if (connectionStatus === 'disconnected') {
    console.log('No QR code available, initializing WhatsApp to get one');

    // Initialize WhatsApp
    try {
      await initWhatsApp();

      // Wait for QR code to be generated
      let attempts = 0;
      while (!qrString && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        console.log(`Waiting for QR code, attempt ${attempts}/20`);
      }
    } catch (error) {
      console.error('Error initializing WhatsApp for QR code:', error);
    }
  }

  return qrString;
};

// Get connection status
export const getConnectionStatus = () => {
  return connectionStatus;
};

// Send text message
export const sendTextMessage = async (number, message) => {
  try {
    if (!waSocket || connectionStatus !== 'connected') {
      throw new Error('WhatsApp is not connected');
    }

    // Format number (remove + and add @s.whatsapp.net)
    const formattedNumber = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

    // Send message
    const result = await waSocket.sendMessage(formattedNumber, { text: message });

    // Log activity
    logActivity('sent', number, message);

    // Add sent message directly to inbox.json
    try {
      // Create message object
      const messageTime = new Date().toISOString();
      const messageObject = {
        id: result.key.id,
        sender: 'me', // Mark as outgoing message
        recipient: formattedNumber, // Store recipient for reference
        message: message,
        timestamp: messageTime,
        read: true, // Outgoing messages are always read
        outgoing: true // Flag to identify outgoing messages
      };

      // Read current inbox
      const inbox = fs.readJsonSync(inboxFile, { throws: false }) || [];

      // Check if message already exists to prevent duplicates
      if (!inbox.some(msg => msg.id === messageObject.id)) {
        // Add new message
        inbox.push(messageObject);

        // Write back to file
        fs.writeJsonSync(inboxFile, inbox, { spaces: 2 });
        console.log('Outgoing message added to inbox:', result.key.id);
      }
    } catch (error) {
      console.error('Error adding outgoing message to inbox:', error);
    }

    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    logActivity('error', number, `Failed to send message: ${error.message}`);
    throw error;
  }
};

// Send media message
export const sendMediaMessage = async (number, filePath, caption = '') => {
  try {
    if (!waSocket || connectionStatus !== 'connected') {
      throw new Error('WhatsApp is not connected');
    }

    // Format number
    const formattedNumber = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    let messageType;

    // Determine message type based on file extension
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      messageType = 'image';
    } else if (['.pdf'].includes(ext)) {
      messageType = 'document';
    } else if (['.doc', '.docx'].includes(ext)) {
      messageType = 'document';
    } else {
      throw new Error('Unsupported file type');
    }

    // Read file
    const file = fs.readFileSync(filePath);

    // Send media
    let result;
    if (messageType === 'image') {
      result = await waSocket.sendMessage(formattedNumber, {
        image: file,
        caption: caption,
      });
    } else {
      result = await waSocket.sendMessage(formattedNumber, {
        document: file,
        mimetype: ext === '.pdf' ? 'application/pdf' : 'application/msword',
        fileName: path.basename(filePath),
        caption: caption,
      });
    }

    // Log activity
    logActivity('sent_media', number, {
      type: messageType,
      filename: path.basename(filePath),
      caption,
    });

    return result;
  } catch (error) {
    console.error('Error sending media:', error);
    logActivity('error', number, `Failed to send media: ${error.message}`);
    throw error;
  }
};

// Logout and clear session
export const logoutWhatsApp = async () => {
  try {
    // Clear the keep-alive interval
    if (global.keepAliveInterval) {
      clearInterval(global.keepAliveInterval);
      global.keepAliveInterval = null;
    }

    if (waSocket) {
      try {
        // Try to logout gracefully
        await waSocket.logout();
      } catch (logoutError) {
        console.log('Error during logout, proceeding with cleanup:', logoutError);
      }

      // Clean up session files
      await fs.emptyDir(sessionsDir);

      // Reset state
      connectionStatus = 'disconnected';
      qrString = null;
      waSocket = null;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error logging out:', error);
    // Even if there's an error, try to clean up
    connectionStatus = 'disconnected';
    qrString = null;
    waSocket = null;
    throw error;
  }
};

// Get inbox messages
export const getInboxMessages = () => {
  try {
    return fs.readJsonSync(inboxFile, { throws: false }) || [];
  } catch (error) {
    console.error('Error reading inbox:', error);
    return [];
  }
};

// Function to check connection status and reconnect if needed
const checkConnectionStatus = async () => {
  try {
    console.log('Checking WhatsApp connection status...');

    // If we're already trying to reconnect, don't interfere
    if (connectionStatus === 'connecting') {
      console.log('Connection is already in progress, skipping check');
      return;
    }

    // If we're disconnected, try to reconnect
    if (connectionStatus === 'disconnected') {
      console.log('Connection is disconnected, attempting to reconnect');
      await initWhatsApp();
      return;
    }

    // If we have a socket but it's not connected properly
    if (waSocket) {
      const isSocketConnected = waSocket.ws && waSocket.ws.readyState === waSocket.ws.OPEN;

      if (!isSocketConnected && connectionStatus === 'connected') {
        console.log('Socket is closed but status is connected, fixing inconsistent state');
        connectionStatus = 'disconnected';

        // Clear any existing keep-alive interval
        if (global.keepAliveInterval) {
          clearInterval(global.keepAliveInterval);
          global.keepAliveInterval = null;
        }

        // Try to reconnect after a short delay
        setTimeout(() => {
          if (connectionStatus === 'disconnected') {
            console.log('Attempting to reconnect after inconsistent state...');
            initWhatsApp().catch(e => {
              console.error('Failed to reconnect after inconsistent state:', e);
            });
          }
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
  }
};

// Set up periodic connection check (every 2 minutes)
let connectionCheckInterval = setInterval(checkConnectionStatus, 120000);

// Initialize WhatsApp on startup
initWhatsApp();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Received SIGINT, cleaning up...');

  // Clear intervals
  if (global.keepAliveInterval) {
    clearInterval(global.keepAliveInterval);
  }

  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }

  // Try to logout gracefully
  if (waSocket && connectionStatus === 'connected') {
    try {
      console.log('Logging out from WhatsApp...');
      await waSocket.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  process.exit(0);
});
