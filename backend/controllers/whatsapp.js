import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import {
  getQRCode,
  getConnectionStatus,
  sendTextMessage,
  sendMediaMessage,
  logoutWhatsApp,
  getInboxMessages,
} from '../services/whatsapp.js';
import { getConfig as getAppConfig, updateConfig as updateAppConfig } from '../config.js';
import { getLogs } from '../utils/logger.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get QR code
export const getQR = async (req, res) => {
  try {
    const qrCode = await getQRCode();

    if (!qrCode) {
      return res.status(404).json({
        status: false,
        message: 'QR code not available. WhatsApp might be already connected or still initializing.',
      });
    }

    res.json({
      status: true,
      message: 'QR code generated successfully',
      data: {
        qrCode,
      },
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get QR code',
      error: error.message,
    });
  }
};

// Get connection status
export const getStatus = (req, res) => {
  try {
    const status = getConnectionStatus();

    res.json({
      status: true,
      message: 'Connection status retrieved successfully',
      data: {
        status,
      },
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get connection status',
      error: error.message,
    });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const result = await logoutWhatsApp();

    if (result) {
      res.json({
        status: true,
        message: 'Logged out successfully',
      });
    } else {
      res.status(400).json({
        status: false,
        message: 'Not connected to WhatsApp',
      });
    }
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to logout',
      error: error.message,
    });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        status: false,
        message: 'Number and message are required',
      });
    }

    // Validate number (should start with country code, no +)
    if (!/^\d+$/.test(number)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid number format. Number should contain only digits and start with country code (e.g., 62812345678)',
      });
    }

    const result = await sendTextMessage(number, message);

    res.json({
      status: true,
      message: 'Message sent successfully',
      data: {
        messageId: result.key.id,
        to: number,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

// Send media
export const sendMedia = async (req, res) => {
  try {
    const { number } = req.body;
    const caption = req.body.caption || '';

    if (!number || !req.file) {
      return res.status(400).json({
        status: false,
        message: 'Number and file are required',
      });
    }

    // Validate number
    if (!/^\d+$/.test(number)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid number format. Number should contain only digits and start with country code (e.g., 62812345678)',
      });
    }

    const result = await sendMediaMessage(number, req.file.path, caption);

    // Clean up uploaded file after sending
    fs.unlinkSync(req.file.path);

    res.json({
      status: true,
      message: 'Media sent successfully',
      data: {
        messageId: result.key.id,
        to: number,
        fileName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('Error sending media:', error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: false,
      message: 'Failed to send media',
      error: error.message,
    });
  }
};

// Get config
export const getConfig = (req, res) => {
  try {
    const config = getAppConfig();

    res.json({
      status: true,
      message: 'Configuration retrieved successfully',
      data: {
        config,
      },
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get configuration',
      error: error.message,
    });
  }
};

// Update config
export const updateConfig = (req, res) => {
  try {
    const newConfig = req.body;

    if (!newConfig || Object.keys(newConfig).length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Configuration data is required',
      });
    }

    const config = updateAppConfig(newConfig);

    if (!config) {
      return res.status(500).json({
        status: false,
        message: 'Failed to update configuration',
      });
    }

    res.json({
      status: true,
      message: 'Configuration updated successfully',
      data: {
        config,
      },
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to update configuration',
      error: error.message,
    });
  }
};

// Get inbox with real-time update support
export const getInbox = (req, res) => {
  try {
    const inbox = getInboxMessages();

    // Check if there's a new messages flag file
    const dataDir = path.join(__dirname, '..');
    const flagFile = path.join(dataDir, 'new_messages_flag.json');

    let hasNewMessages = false;
    let lastMessageTime = null;
    let lastMessageId = null;

    if (fs.existsSync(flagFile)) {
      try {
        const flagData = fs.readJsonSync(flagFile);
        hasNewMessages = flagData.hasNewMessages || false;
        lastMessageTime = flagData.lastMessageTime || null;
        lastMessageId = flagData.messageId || null;

        // Reset the flag after reading it
        fs.writeJsonSync(flagFile, {
          hasNewMessages: false,
          lastMessageTime,
          messageId: lastMessageId
        }, { spaces: 2 });
      } catch (flagError) {
        console.error('Error reading new messages flag:', flagError);
      }
    }

    res.json({
      status: true,
      message: 'Inbox retrieved successfully',
      data: {
        inbox,
        hasNewMessages,
        lastMessageTime,
        lastMessageId
      },
    });
  } catch (error) {
    console.error('Error getting inbox:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get inbox',
      error: error.message,
    });
  }
};

// Get messages for a specific contact (for active chat updates)
export const getContactMessages = (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        status: false,
        message: 'Phone number is required',
      });
    }

    // Get all inbox messages
    const allMessages = getInboxMessages();

    // Filter messages for this contact
    const contactMessages = allMessages.filter(msg => {
      // Check if this message is from the contact
      const senderNumber = msg.sender.includes('@s.whatsapp.net')
        ? msg.sender.replace('@s.whatsapp.net', '')
        : msg.sender;

      // Check if this is an outgoing message to the contact
      const isOutgoing = msg.sender === 'me' && msg.recipient &&
        msg.recipient.includes(phoneNumber);

      return senderNumber === phoneNumber || isOutgoing;
    });

    res.json({
      status: true,
      message: 'Contact messages retrieved successfully',
      data: {
        messages: contactMessages,
        phoneNumber,
        timestamp: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error('Error getting contact messages:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get contact messages',
      error: error.message,
    });
  }
};

// Get logs
export const getActivityLogs = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = getLogs(limit);

    res.json({
      status: true,
      message: 'Logs retrieved successfully',
      data: {
        logs,
      },
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get logs',
      error: error.message,
    });
  }
};
