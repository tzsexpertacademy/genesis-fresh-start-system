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

// Initialize environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create necessary directories if they don't exist
fs.ensureDirSync(path.join(__dirname, 'sessions'));
fs.ensureDirSync(path.join(__dirname, 'logs'));

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

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}/api`);
});
