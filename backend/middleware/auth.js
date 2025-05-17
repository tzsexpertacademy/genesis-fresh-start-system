import { getConfig } from '../config.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Authentication middleware - simplified version without Supabase
export const authenticate = async (req, res, next) => {
  try {
    // In development mode, just pass through
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: No authentication required');
      return next();
    }

    // Check API key for production
    const config = getConfig();
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== config.apiKey) {
      return res.status(401).json({
        status: false,
        message: 'Unauthorized: Invalid API key',
      });
    }

    // No user authentication required
    console.log('API request authenticated with API key');
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error during authentication',
    });
  }
};
