import * as baileys from 'baileys';
import qrcode from 'qrcode';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { Boom } from '@hapi/boom';
import { logActivity } from '../utils/logger.js';
import { getConfig as getAppConfig } from '../config.js'; // General app config
import { getConfig as getAiConfig, processMessage as processGeminiMessage } from './gemini.js';
import { processMessage as processOpenAIMessage } from './openaiService.js';
import { processMessage as processGroqMessage } from './groqService.js';


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
          } else if (isConnectionClosed || isConnectionLost || isTimedOut) { // Added temporaryDisconnect check
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
        logActivity('received', sender, messageContent);

        const messageTime = new Date().toISOString();
        const messageObject = {
          id: msg.key.id,
          sender,
          message: messageContent,
          timestamp: messageTime,
          read: false
        };

        fs.writeJsonSync(flagFile, {
          hasNewMessages: true,
          lastMessageTime: messageTime,
          messageId: msg.key.id
        }, { spaces: 2 });

        try {
          broadcastNewMessage(messageObject);
          console.log('Real-time notifications sent successfully');
        } catch (error) {
          console.error('Error sending real-time notifications:', error);
        }

        // AI Processing Logic
        const aiConfig = getAiConfig(); 
        console.log('[whatsapp.js] AI Config for incoming message:', { enabled: aiConfig.enabled, activeAIProvider: aiConfig.activeAIProvider });
        const appGenConfig = getAppConfig(); 

        if (aiConfig.enabled) { 
          console.log(`[whatsapp.js] AI Auto-Reply is ENABLED. Active provider: ${aiConfig.activeAIProvider}`);
          let aiServiceResponse = null; 
          
          let systemInstructionsToUse = aiConfig.instructions; 

          try {
            switch (aiConfig.activeAIProvider) {
              case 'gemini':
                if (aiConfig.geminiSpecificInstructions && aiConfig.geminiSpecificInstructions.trim() !== '') {
                  systemInstructionsToUse = aiConfig.geminiSpecificInstructions;
                }
                console.log(`[whatsapp.js] Using instructions for Gemini auto-reply: "${systemInstructionsToUse.substring(0,50)}..."`);
                aiServiceResponse = await processGeminiMessage(messageContent, sender); 
                break;
              case 'openai':
                if (aiConfig.openaiSpecificInstructions && aiConfig.openaiSpecificInstructions.trim() !== '') {
                  systemInstructionsToUse = aiConfig.openaiSpecificInstructions;
                }
                console.log(`[whatsapp.js] Using instructions for OpenAI auto-reply: "${systemInstructionsToUse.substring(0,50)}..."`);
                aiServiceResponse = await processOpenAIMessage(messageContent, sender, systemInstructionsToUse, aiConfig.openaiModel);
                break;
              case 'groq':
                if (aiConfig.groqSpecificInstructions && aiConfig.groqSpecificInstructions.trim() !== '') {
                  systemInstructionsToUse = aiConfig.groqSpecificInstructions;
                }
                console.log(`[whatsapp.js] Using instructions for Groq auto-reply: "${systemInstructionsToUse.substring(0,50)}..."`);
                aiServiceResponse = await processGroqMessage(messageContent, sender, systemInstructionsToUse, aiConfig.groqModel);
                break;
              default:
                console.log(`[whatsapp.js] Unknown AI provider: ${aiConfig.activeAIProvider}. Falling back to Gemini if configured.`);
                if (process.env.GEMINI_API_KEY) { 
                    if (aiConfig.geminiSpecificInstructions && aiConfig.geminiSpecificInstructions.trim() !== '') {
                      systemInstructionsToUse = aiConfig.geminiSpecificInstructions;
                    }
                    console.log(`[whatsapp.js] Using instructions for Fallback Gemini auto-reply: "${systemInstructionsToUse.substring(0,50)}..."`);
                    aiServiceResponse = await processGeminiMessage(messageContent, sender);
                } else {
                    console.log("[whatsapp.js] Fallback to Gemini failed: GEMINI_API_KEY not set.");
                }
            }

            if (aiServiceResponse && aiServiceResponse.status && aiServiceResponse.text) {
              console.log(`[whatsapp.js] Sending AI response (${aiConfig.activeAIProvider}) back to WhatsApp...`);
              await sendTextMessage(sender, aiServiceResponse.text);
              logActivity(`ai_response_${aiConfig.activeAIProvider}`, sender, aiServiceResponse.text);
              console.log(`[whatsapp.js] AI response (${aiConfig.activeAIProvider}) sent successfully`);
              return; 
            } else {
              console.log(`[whatsapp.js] No valid response from ${aiConfig.activeAIProvider} AI (Status: ${aiServiceResponse?.status}, Error: ${aiServiceResponse?.error}). Checking regular auto-reply.`);
            }
          } catch (aiError) {
            console.error(`[whatsapp.js] Error processing message with ${aiConfig.activeAIProvider} AI:`, aiError);
          }
        } else {
            console.log("[whatsapp.js] AI Auto-Reply is DISABLED in settings.");
        }
        
        // If AI didn't respond (or was disabled), try the old simple auto-reply
        if (appGenConfig.autoReply && appGenConfig.autoReply.enabled) {
          console.log('[whatsapp.js] Sending regular auto-reply message');
          await sendTextMessage(sender, appGenConfig.autoReply.message);
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
  if (qrString) return qrString;
  if (connectionStatus === 'connected') return null;
  if (connectionStatus === 'disconnected') {
    console.log('No QR code available, initializing WhatsApp to get one');
    try {
      await initWhatsApp();
      let attempts = 0;
      while (!qrString && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
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
    const formattedNumber = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const result = await waSocket.sendMessage(formattedNumber, { text: message });
    logActivity('sent', number, message);

    try {
      const messageTime = new Date().toISOString();
      const messageObject = {
        id: result.key.id,
        sender: 'me',
        recipient: formattedNumber,
        message: message,
        timestamp: messageTime,
        read: true,
        outgoing: true
      };
      const inbox = fs.readJsonSync(inboxFile, { throws: false }) || [];
      if (!inbox.some(msg => msg.id === messageObject.id)) {
        inbox.push(messageObject);
        fs.writeJsonSync(inboxFile, inbox, { spaces: 2 });
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
    const formattedNumber = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    let messageType;
    if (['.jpg', '.jpeg', '.png'].includes(ext)) messageType = 'image';
    else if (['.pdf'].includes(ext)) messageType = 'document';
    else if (['.doc', '.docx'].includes(ext)) messageType = 'document';
    else throw new Error('Unsupported file type');

    const file = fs.readFileSync(filePath);
    let result;
    if (messageType === 'image') {
      result = await waSocket.sendMessage(formattedNumber, { image: file, caption: caption });
    } else {
      result = await waSocket.sendMessage(formattedNumber, {
        document: file,
        mimetype: ext === '.pdf' ? 'application/pdf' : 'application/msword',
        fileName: path.basename(filePath),
        caption: caption,
      });
    }
    logActivity('sent_media', number, { type: messageType, filename: path.basename(filePath), caption });
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
    if (global.keepAliveInterval) {
      clearInterval(global.keepAliveInterval);
      global.keepAliveInterval = null;
    }
    if (waSocket) {
      try {
        await waSocket.logout();
      } catch (logoutError) {
        console.log('Error during logout, proceeding with cleanup:', logoutError);
      }
      await fs.emptyDir(sessionsDir);
      connectionStatus = 'disconnected';
      qrString = null;
      waSocket = null;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error logging out:', error);
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

const checkConnectionStatus = async () => {
  try {
    if (connectionStatus === 'connecting') return;
    if (connectionStatus === 'disconnected') {
      await initWhatsApp();
      return;
    }
    if (waSocket) {
      const isSocketConnected = waSocket.ws && waSocket.ws.readyState === waSocket.ws.OPEN;
      if (!isSocketConnected && connectionStatus === 'connected') {
        connectionStatus = 'disconnected';
        if (global.keepAliveInterval) clearInterval(global.keepAliveInterval);
        setTimeout(() => {
          if (connectionStatus === 'disconnected') initWhatsApp().catch(e => console.error(e));
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
  }
};

let connectionCheckInterval = setInterval(checkConnectionStatus, 120000);

initWhatsApp();

process.on('SIGINT', async () => {
  console.log('Received SIGINT, cleaning up...');
  if (global.keepAliveInterval) clearInterval(global.keepAliveInterval);
  if (connectionCheckInterval) clearInterval(connectionCheckInterval);
  if (waSocket && connectionStatus === 'connected') {
    try {
      await waSocket.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  process.exit(0);
});