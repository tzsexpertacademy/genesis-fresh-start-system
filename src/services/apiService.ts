/**
 * API Service for making requests to the backend
 */

// Use environment variables if available, otherwise use relative URL
// Using relative URL to avoid CORS issues
export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const API_KEY = import.meta.env.VITE_API_KEY || 'your-api-key-here';

/**
 * Get the base URL for API requests
 */
export const getApiBaseUrl = (): string => {
  return API_URL;
};

/**
 * Get the API key
 */
export const getApiKey = (): string => {
  return API_KEY;
};
