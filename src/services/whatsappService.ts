// Import API configuration from apiService
import { API_URL, API_KEY } from './apiService';

// Import state manager for request throttling
import stateManager from '../utils/stateManager';

// API response cache
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// Cache for API responses
const apiCache: Record<string, CacheEntry> = {};

// Default cache TTL in milliseconds (10 seconds)
const DEFAULT_CACHE_TTL = 10000;

// Constants
const API_BASE_URL = '/api'; // API base URL
const USE_MOCK_DATA = false; // Set to false to use real API instead of mock data
const DEVELOPMENT_MODE = false; // Set to false to use real API in development mode
const DEBUG_MODE = true; // Set to true to enable debug logging

// Add timeout to fetch requests with improved error handling
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    // Add cache-busting parameter to prevent browser caching
    const urlWithCacheBuster = url.includes('?')
      ? `${url}&_=${Date.now()}`
      : `${url}?_=${Date.now()}`;

    const response = await fetch(urlWithCacheBuster, {
      ...options,
      signal: controller.signal,
      credentials: 'include', // Include cookies for cross-origin requests
      cache: 'no-store', // Prevent browser caching
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Helper function for API requests with caching and throttling
export const apiRequest = async (endpoint: string, options: RequestInit & { isFormData?: boolean } = {}, timeout = 10000, cacheTTL = DEFAULT_CACHE_TTL) => {
  try {
    // Check if we should throttle this request
    const shouldMakeRequest = stateManager.shouldMakeApiRequest(endpoint, 2000);

    // For GET requests, check if we have a valid cached response
    const isGetRequest = !options.method || options.method === 'GET';
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;

    // Skip cache for contact messages to ensure real-time updates
    const isContactMessagesRequest = endpoint.includes('/contact/') && endpoint.includes('/messages');

    if (isGetRequest && !isContactMessagesRequest && apiCache[cacheKey] && apiCache[cacheKey].expiresAt > Date.now()) {
      console.log(`Using cached response for ${endpoint}`);
      return apiCache[cacheKey].data;
    }

    // In development mode, always return dummy data for contacts and categories
    if (DEVELOPMENT_MODE && endpoint === '/contacts') {
      console.log('Development mode: Returning dummy contacts');
      return {
        status: true,
        message: 'Using development dummy contacts',
        data: {
          contacts: [
            {
              id: 'dummy-1',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'John Doe',
              phone_number: '628123456789',
              email: 'john@example.com',
              notes: 'Sample contact',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              categories: [
                {
                  id: 'dummy-1',
                  user_id: '00000000-0000-0000-0000-000000000000',
                  name: 'Family',
                  color: '#EF4444',
                  description: 'Family members and relatives',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]
            },
            {
              id: 'dummy-2',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Jane Smith',
              phone_number: '628987654321',
              email: 'jane@example.com',
              notes: 'Another sample contact',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              categories: [
                {
                  id: 'dummy-2',
                  user_id: '00000000-0000-0000-0000-000000000000',
                  name: 'Friends',
                  color: '#3B82F6',
                  description: 'Friends and social contacts',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]
            }
          ]
        }
      };
    }

    if (DEVELOPMENT_MODE && endpoint === '/contact-categories') {
      console.log('Development mode: Returning dummy contact categories');
      return {
        status: true,
        message: 'Using development dummy contact categories',
        data: {
          categories: [
            {
              id: 'dummy-1',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Family',
              color: '#EF4444',
              description: 'Family members and relatives',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contact_count: 1
            },
            {
              id: 'dummy-2',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Friends',
              color: '#3B82F6',
              description: 'Friends and social contacts',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contact_count: 1
            },
            {
              id: 'dummy-3',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Work',
              color: '#10B981',
              description: 'Work colleagues and business contacts',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contact_count: 0
            }
          ]
        }
      };
    }

    // If we're throttling and it's not in the cache, return a default response
    // But never throttle Gemini API validation requests or contact message requests
    if (!shouldMakeRequest && !apiCache[cacheKey] &&
        endpoint !== '/gemini/validate-key' &&
        !isContactMessagesRequest) {
      console.log(`Throttling API request to ${endpoint}`);

      // Return default responses for specific endpoints to prevent UI breaking
      if (endpoint === '/status') {
        return { status: true, data: { status: 'connected' } };
      }

      if (endpoint === '/gemini/config') {
        // If we have any cached gemini config, return the most recent one
        const geminiConfigCacheKeys = Object.keys(apiCache)
          .filter(key => key.startsWith('/gemini/config'));

        if (geminiConfigCacheKeys.length > 0) {
          const mostRecentCache = geminiConfigCacheKeys
            .map(key => apiCache[key])
            .sort((a, b) => b.timestamp - a.timestamp)[0];

          if (mostRecentCache) {
            console.log('Using most recent gemini config cache');
            return mostRecentCache.data;
          }
        }

        // If no cache exists, return a default config
        return {
          status: true,
          message: 'Using default Gemini configuration',
          data: {
            config: {
              enabled: false,
              apiKey: '****',
              model: 'gemini-1.5-pro',
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
              instructions: 'Kamu adalah ai yang sopan dan selalu menjawaba dalam bahasa indonesia, kamu akan menjawab pertanyaan dengan singkat dengan maksimal 3 kalimat atau 20 kata atau 100 karakter kamu lucu.',
              autoReplyEnabled: false,
              autoReplyTrigger: '!ai'
            }
          }
        };
      }

      // For inbox endpoint, return a properly formatted response
      if (endpoint === '/inbox') {
        return {
          status: true,
          message: 'Using throttled inbox response',
          data: {
            inbox: [],
            hasNewMessages: false,
            lastMessageTime: new Date().toISOString(),
            messageId: ''
          }
        };
      }
      
      // Add fallback for /items endpoint
      if (endpoint === '/items') {
        return {
          status: true,
          message: 'Using fallback items due to throttling',
          data: { items: [] }
        };
      }

      // For all OTHER endpoints that would have shown the generic throttle message:
      return {
        status: false,
        message: '', // Return empty message for throttled requests
        isThrottled: true, // Add a flag to indicate it was a throttle
        data: null
      };
    }

    // Log the request (only if not throttled)
    console.log(`Making API request to ${endpoint} with timeout ${timeout}ms`);
    
    // Add request debugging - log full request details
    if (DEBUG_MODE) {
      console.log('Request Options:', { 
        url: `${API_URL}${endpoint}`, 
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : '[FormData]') : null
      });
    }

    // Create headers with Content-Type but only add x-api-key if it's not empty or default
    const headers: Record<string, string> = {
      ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
      'X-Requested-With': 'XMLHttpRequest', // This helps prevent page reloads
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers, // Allow overriding with custom headers
    };

    // Only add API key if it's not the default value
    if (API_KEY && API_KEY !== 'your-api-key-here') {
      headers['x-api-key'] = API_KEY;
    }

    // Improved request options for SPA
    const requestOptions = {
      ...options,
      headers,
      redirect: 'follow' as RequestRedirect,
      referrerPolicy: 'no-referrer-when-downgrade' as ReferrerPolicy,
      cache: 'no-store' as RequestCache, // Prevent browser caching
      credentials: 'include' as RequestCredentials, // Include cookies for cross-origin requests
    };

    // Set multiple flags to prevent page reloads
    sessionStorage.setItem('api_request_in_progress', 'true');
    sessionStorage.setItem(`api_request_${endpoint.replace(/\//g, '_')}`, 'true');

    // Set a global flag to prevent navigation
    const originalBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = (e) => {
      e.preventDefault();
      console.log('Preventing page unload during API request');
      return '';
    };

    // Also prevent form submissions during API requests
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      console.log('Form submission prevented during API request');
      return false;
    };

    let response;
    try {
      // Log the request for debugging
      console.log(`Making API request to ${endpoint} with method ${options.method || 'GET'}`);

      // Add a timestamp to prevent caching
      const url = `${API_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;

      response = await fetchWithTimeout(url, requestOptions, timeout);

      // Log response status for debugging
      console.log(`API response status for ${endpoint}: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Server error, please try again later';
        let errorDetails = {};
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorDetails = errorData;
          console.error(`API error response for ${endpoint}:`, errorData);
        } catch (e) {
          console.error('Could not parse error response as JSON');
        }
        
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();

      // Log success for debugging
      console.log(`API request to ${endpoint} completed successfully`, data.status ? 'Status: OK' : 'Status: Failed');
      
      if (DEBUG_MODE && data) {
        console.log(`API response data preview for ${endpoint}:`, 
          data.data ? 
            (typeof data.data === 'object' ? 'Data object received' : data.data) 
            : 'No data received');
      }

      // Clear all flags when the request is complete
      sessionStorage.removeItem('api_request_in_progress');
      sessionStorage.removeItem(`api_request_${endpoint.replace(/\//g, '_')}`);
      window.onbeforeunload = originalBeforeUnload;

      // Restore original form submit
      HTMLFormElement.prototype.submit = originalSubmit;

      return data;
    } catch (error) {
      // Log error for debugging
      console.error(`API request to ${endpoint} failed:`, error);
      
      // Add more details on network error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(`Network error details for ${endpoint}:`, { 
          url: `${API_URL}${endpoint}`,
          crossOrigin: API_URL.startsWith('http') && !API_URL.includes(window.location.hostname)
        });
      }

      // Clear all flags even if there's an error
      sessionStorage.removeItem('api_request_in_progress');
      sessionStorage.removeItem(`api_request_${endpoint.replace(/\//g, '_')}`);
      window.onbeforeunload = originalBeforeUnload;

      // Restore original form submit
      HTMLFormElement.prototype.submit = originalSubmit;

      // Check if this is a connection error (server not running)
      const isConnectionError = error instanceof TypeError &&
        (error.message.includes('Failed to fetch') ||
         error.message.includes('NetworkError') ||
         error.message.includes('Network request failed') ||
         error.message.includes('ERR_CONNECTION_REFUSED'));

      if (isConnectionError) {
        console.log(`Connection error detected for ${endpoint}, using fallback response`);

        // For Gemini validate key endpoint
        if (endpoint === '/gemini/validate-key') {
          return {
            status: false,
            message: 'Cannot validate API key. Server connection error.',
            data: {
              details: 'The backend server appears to be offline. Please check if the server is running.'
            }
          };
        }

        // For other endpoints, let the outer catch handle it
      }

      throw error;
    }

    // Note: The code below is unreachable due to the early return in the try block
    // This is kept for reference only and will be removed in a future update
    console.log(`API response from ${endpoint} (unreachable code)`);
    return null;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    
    // Improved error logging
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, message: ${error.message}`);
      
      // Check for common error patterns
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        console.error('This appears to be a network connectivity issue. Please check if:');
        console.error('1. The backend server is running');
        console.error(`2. The API URL ${API_URL} is correct`);
        console.error('3. There are no CORS issues (check browser console for CORS errors)');
      } else if (error.message.includes('404')) {
        console.error(`Endpoint ${endpoint} not found. Please check if the API route exists.`);
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('Authentication error. User may not be logged in or token expired.');
      }
    }

    // First check if we have any cached data for this endpoint
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;
    if (apiCache[cacheKey]) {
      console.log(`Using cached data for ${endpoint} due to error`);
      return apiCache[cacheKey].data;
    }

    // Return default responses for specific endpoints to prevent UI breaking
    if (endpoint === '/status') {
      return {
        status: true,
        message: 'Using fallback status due to connection error',
        data: { status: 'disconnected' }
      };
    }

    if (endpoint === '/qr') {
      return {
        status: false,
        message: 'Failed to fetch QR code. Please check if the server is running.'
      };
    }

    // Handle contact messages endpoint
    if (endpoint.includes('/contact/') && endpoint.includes('/messages')) {
      // Extract phone number from the endpoint
      const phoneNumberMatch = endpoint.match(/\/contact\/([^\/]+)\/messages/);
      const phoneNumber = phoneNumberMatch ? phoneNumberMatch[1] : 'unknown';

      // Create dummy messages for this contact
      const dummyMessages = [
        {
          id: `dummy-${phoneNumber}-1`,
          sender: `${phoneNumber}@s.whatsapp.net`,
          message: 'This is a fallback message. The backend server is not available.',
          timestamp: new Date().toISOString(),
          read: true
        },
        {
          id: `dummy-${phoneNumber}-2`,
          sender: 'me',
          recipient: phoneNumber,
          message: 'This is a fallback reply message.',
          timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
          read: true,
          outgoing: true
        }
      ];

      return {
        status: true,
        message: 'Using fallback contact messages due to connection error',
        data: {
          messages: dummyMessages,
          phoneNumber,
          timestamp: new Date().toISOString()
        }
      };
    }

    if (endpoint === '/inbox') {
      // Buat data dummy untuk tampilan inbox ketika backend tidak tersedia
      const dummyData = {
        inbox: [
          {
            id: 'dummy-1',
            sender: '6289712345678@s.whatsapp.net',
            message: 'Halo, ini adalah pesan contoh. Backend sedang tidak tersedia.',
            timestamp: new Date().toISOString(),
            read: true
          },
          {
            id: 'dummy-2',
            sender: '6289712345678@s.whatsapp.net',
            message: 'Silakan jalankan server backend untuk melihat pesan asli.',
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 menit yang lalu
            read: true
          },
          {
            id: 'dummy-3',
            sender: 'me',
            message: 'Ini adalah contoh pesan balasan dari Anda.',
            timestamp: new Date(Date.now() - 3 * 60000).toISOString(), // 3 menit yang lalu
            read: true
          }
        ],
        hasNewMessages: false
      };

      return {
        status: true,
        message: 'Using dummy inbox data due to connection error',
        data: dummyData
      };
    }

    if (endpoint === '/gemini/config') {
      return {
        status: true,
        message: 'Using default Gemini configuration due to connection error',
        data: {
          config: {
            enabled: false,
            apiKey: '****',
            model: 'gemini-1.5-pro',
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            instructions: 'kamu adalah ai yang sopan dan selalu menjawaba dalam bahasa indonesia, kamu akan menjawab pertanyaan dengan singkat dengan maksimal 3 kalimat atau 20 kata atau 100 karakter kamu lucu.',
            autoReplyEnabled: false,
            autoReplyTrigger: '!ai'
          }
        }
      };
    }

    if (endpoint === '/gemini/validate-key') {
      return {
        status: false,
        message: 'Cannot validate API key. Server connection error.',
        data: {
          details: isConnectionError(error)
            ? 'The backend server appears to be offline. Please check if the server is running.'
            : error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }

    // Handle contact categories endpoint
    if (endpoint === '/contact-categories') {
      return {
        status: true,
        message: 'Using fallback contact categories due to connection error',
        data: {
          categories: [
            {
              id: 'dummy-1',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Family',
              color: '#EF4444',
              description: 'Family members and relatives',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contact_count: 0
            },
            {
              id: 'dummy-2',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Friends',
              color: '#3B82F6',
              description: 'Friends and social contacts',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contact_count: 0
            },
            {
              id: 'dummy-3',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Work',
              color: '#10B981',
              description: 'Work colleagues and business contacts',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contact_count: 0
            }
          ]
        }
      };
    }

    // Handle contacts endpoint
    if (endpoint === '/contacts') {
      return {
        status: true,
        message: 'Using fallback contacts due to connection error',
        data: {
          contacts: [
            {
              id: 'dummy-1',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'John Doe',
              phone_number: '628123456789',
              email: 'john@example.com',
              notes: 'Sample contact',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              categories: [
                {
                  id: 'dummy-1',
                  user_id: '00000000-0000-0000-0000-000000000000',
                  name: 'Family',
                  color: '#EF4444',
                  description: 'Family members and relatives',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]
            },
            {
              id: 'dummy-2',
              user_id: '00000000-0000-0000-0000-000000000000',
              name: 'Jane Smith',
              phone_number: '628987654321',
              email: 'jane@example.com',
              notes: 'Another sample contact',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              categories: [
                {
                  id: 'dummy-2',
                  user_id: '00000000-0000-0000-0000-000000000000',
                  name: 'Friends',
                  color: '#3B82F6',
                  description: 'Friends and social contacts',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]
            }
          ]
        }
      };
    }
    
    // Add fallback for /items endpoint
    if (endpoint === '/items') {
      return {
        status: true,
        message: 'Using fallback items due to API error',
        data: { items: [] }
      };
    }


    // For any other endpoint, return a generic error response
    return {
      status: false,
      message: isConnectionError(error)
        ? 'Server connection error. Please check if the backend server is running.'
        : error instanceof Error 
          ? `Error: ${error.message}`
          : 'An error occurred while processing your request.',
      error: error instanceof Error ? error.message : String(error),
      data: null
    };
  }
};

// Get QR code
export const getQRCode = async () => {
  return apiRequest('/qr');
};

// Get connection status
export const getConnectionStatus = async () => {
  return apiRequest('/status');
};

// Logout
export const logout = async () => {
  return apiRequest('/logout', {
    method: 'POST',
  });
};

// Send text message
export const sendTextMessage = async (number: string, message: string) => {
  return apiRequest('/send-message', {
    method: 'POST',
    body: JSON.stringify({ number, message }),
  });
};

// Send media message
export const sendMediaMessage = async (number: string, file: File, caption: string = '') => {
  try {
    const formData = new FormData();
    formData.append('number', number);
    formData.append('file', file);
    formData.append('caption', caption);

    // Create headers but only add x-api-key if it's not empty or default
    const headers: Record<string, string> = {};

    // Only add API key if it's not the default value
    if (API_KEY && API_KEY !== 'your-api-key-here') {
      headers['x-api-key'] = API_KEY;
    }

    // Use a longer timeout for media uploads (30 seconds)
    const response = await fetchWithTimeout(`${API_URL}/send-media`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include', // Include cookies in the request
    }, 30000);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'Failed to send media. Server error.'
      }));
      throw new Error(errorData.message || 'Failed to send media');
    }

    return response.json();
  } catch (error) {
    console.error('Media upload failed:', error);
    throw error instanceof Error ? error : new Error('Network error during media upload');
  }
};

// Get configuration
export const getConfig = async () => {
  return apiRequest('/config');
};

// Update configuration
export const updateConfig = async (config: any) => {
  return apiRequest('/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
};

// Cache for inbox messages to reduce unnecessary updates
let inboxCache = {
  data: null,
  timestamp: 0
};

// Get messages for a specific contact (for active chat updates)
export const getContactMessages = async (phoneNumber: string) => {
  if (!phoneNumber) {
    console.error('Phone number is required to get contact messages');
    return {
      status: false,
      message: 'Phone number is required',
      data: null
    };
  }

  console.log(`Requesting messages for contact ${phoneNumber}`);

  // Use a shorter timeout (5 seconds) and NO CACHE for better real-time experience
  return apiRequest(`/contact/${phoneNumber}/messages`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-No-Reload': 'true'
    }
  }, 5000, 0); // Set cache TTL to 0 to always get fresh data
};

// Get inbox messages with improved real-time support and no page reloads
export const getInbox = async () => {
  // Prevent any page reloads during this operation
  const originalBeforeUnload = window.onbeforeunload;
  window.onbeforeunload = (e) => {
    e.preventDefault();
    console.log('Preventing page unload during inbox fetch');
    return '';
  };

  // Generate a unique request ID to track this specific request
  const requestId = `inbox_request_${Date.now()}`;
  sessionStorage.setItem(requestId, 'in_progress');

  // Set a global flag to indicate an API request is in progress
  sessionStorage.setItem('api_request_in_progress', 'true');

  try {
    console.log('Requesting inbox data from API...');

    // Use a shorter timeout for inbox requests (8 seconds) and shorter cache TTL (5s)
    // Add custom headers to prevent page reloads
    const response = await apiRequest('/inbox', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-No-Reload': 'true' // Custom header to signal this should never cause a page reload
      }
    }, 8000, 5000);

    // Check if this request is still relevant (not superseded by a newer one)
    if (sessionStorage.getItem(requestId) !== 'in_progress') {
      console.log('Newer inbox request in progress, discarding results');
      return response; // Still return the response but don't process it further
    }

    console.log('Inbox API response received');

    // Check if there are new messages
    if (response.status && response.data?.hasNewMessages) {
      console.log('New messages detected from API response');

      // Set a flag in sessionStorage to notify other components
      // But use a timestamp to prevent duplicate processing
      const newMessageTimestamp = response.data.lastMessageTime || Date.now().toString();
      const lastProcessedTimestamp = sessionStorage.getItem('whatsapp_last_processed_message_time');

      if (!lastProcessedTimestamp || lastProcessedTimestamp !== newMessageTimestamp) {
        // Only set the flag if this is a new message we haven't processed yet
        sessionStorage.setItem('whatsapp_new_messages', 'true');
        sessionStorage.setItem('whatsapp_last_processed_message_time', newMessageTimestamp);

        // Also store the last message info
        if (response.data.lastMessageTime) {
          sessionStorage.setItem('whatsapp_last_message_time', response.data.lastMessageTime);
        }
        if (response.data.lastMessageId) {
          sessionStorage.setItem('whatsapp_last_message_id', response.data.lastMessageId);
        }
      }
    }

    // Update cache
    inboxCache = {
      data: response,
      timestamp: Date.now()
    };

    return response;
  } catch (error) {
    console.error('Error fetching inbox:', error);

    // If we have cached data and it's less than 30 seconds old, use it
    if (inboxCache.data && Date.now() - inboxCache.timestamp < 30000) {
      console.log('Using cached inbox data due to error');
      return inboxCache.data;
    }

    // If we don't have cached data, return a default response
    // This prevents the UI from breaking completely
    console.log('No cached data available, returning default empty response');
    return {
      status: true,
      message: 'Using fallback empty inbox due to connection error',
      data: {
        inbox: [],
        hasNewMessages: false
      }
    };
  } finally {
    // Clean up the request tracking
    sessionStorage.removeItem(requestId);
    sessionStorage.removeItem('api_request_in_progress');

    // Restore the original beforeunload handler
    window.onbeforeunload = originalBeforeUnload;
  }
};

// Get logs
export const getLogs = async (limit: number = 100) => {
  return apiRequest(`/logs?limit=${limit}`);
};

// Helper function to identify connection errors
function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  const errorMsg = error.message ? error.message.toLowerCase() : '';
  return (
    errorMsg.includes('network') ||
    errorMsg.includes('connection') ||
    errorMsg.includes('timeout') ||
    errorMsg.includes('econnrefused') ||
    errorMsg.includes('enotfound') ||
    errorMsg.includes('etimedout') ||
    (error.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code.toUpperCase()))
  );
}