import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import http from 'http';

// Import routes
import routes from './routes/index.js';

// Import WebSocket service
import { initWebSocket } from './services/websocket.js';

// Import Scheduled Message Service and WhatsApp Service
import { getDueScheduledMessages, updateScheduledMessageStatus } from './services/scheduleService.js';
import { sendTextMessage, getConnectionStatus as getWhatsAppConnectionStatus } from './services/whatsapp.js'; // Import sendTextMessage and getConnectionStatus

// Initialize environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create necessary directories if they don't exist
fs.ensureDirSync(path.join(__dirname, 'sessions'));
fs.ensureDirSync(path.join(__dirname, 'logs'));
fs.ensureDirSync(path.join(__dirname, 'data')); // Ensure data directory exists

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server
const server = http.createServer(app);

// Set up rate limiter: maximum of 100 requests per minute
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all requests
app.use(limiter);

// Set up logging
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs', 'access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add middleware to prevent page reloads
app.use((req, res, next) => {
  // Add headers that help prevent page reloads in the browser
  res.setHeader('X-No-Reload', 'true');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Continue to the next middleware
  next();
});

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: false,
    message: 'Internal Server Error',
    error: err.message,
  });
});

// Initialize WebSocket server
initWebSocket(server);

// --- Scheduled Message Scheduler ---
const SCHEDULE_CHECK_INTERVAL = 60000; // Check every 60 seconds

const checkAndSendScheduledMessages = async () => {
  console.log('[SchedulerLoop] Starting check for due scheduled messages...');
  try {
    const currentWhatsAppStatus = getWhatsAppConnectionStatus();
    console.log(`[SchedulerLoop] Current WhatsApp connection status: ${currentWhatsAppStatus}`);

    if (currentWhatsAppStatus !== 'connected') {
      console.warn('[SchedulerLoop] WhatsApp is not connected. Skipping sending of scheduled messages.');
      // Optionally, you could try to re-initialize WhatsApp here if it's consistently disconnected
      // await initWhatsApp(); // Be cautious with this, might lead to loops if init fails repeatedly
      return;
    }

    const dueMessages = getDueScheduledMessages(); // This function now has detailed logging

    if (dueMessages.length > 0) {
      console.log(`[SchedulerLoop] Processing ${dueMessages.length} due messages.`);
      for (const message of dueMessages) {
        console.log(`[SchedulerLoop] Attempting to send message ID: ${message.id} to ${message.number} with content: "${message.message.substring(0,30)}..."`);
        try {
          // Send the message using the WhatsApp service
          await sendTextMessage(message.number, message.message);

          // Update status to 'sent'
          updateScheduledMessageStatus(message.id, 'sent');
          console.log(`[SchedulerLoop] Successfully sent scheduled message ID: ${message.id} to ${message.number}. Status updated to 'sent'.`);
        } catch (sendError) {
          console.error(`[SchedulerLoop] Failed to send scheduled message ID: ${message.id} to ${message.number}. Error:`, sendError.message);
          // Update status to 'failed' with error details
          updateScheduledMessageStatus(message.id, 'failed', sendError.message || 'Unknown error');
        }
      }
    } else {
      console.log('[SchedulerLoop] No due messages found by getDueScheduledMessages.');
    }
  } catch (error) {
    console.error('[SchedulerLoop] Error in scheduler main loop:', error);
  }
  console.log('[SchedulerLoop] Finished check for due scheduled messages.');
};

// Start the scheduler interval
setInterval(checkAndSendScheduledMessages, SCHEDULE_CHECK_INTERVAL);
console.log(`[Server] Scheduled message scheduler started, checking every ${SCHEDULE_CHECK_INTERVAL / 1000} seconds.`);

// --- End Scheduled Message Scheduler ---


// Start server
server.listen(PORT, () => {
  console.log(`[Server] Server is running on port ${PORT}`);
  console.log(`[Server] WebSocket server is running on ws://localhost:${PORT}/api`);
});