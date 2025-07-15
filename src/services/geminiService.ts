import { apiRequest } from './whatsappService';
import stateManager from '../utils/stateManager';

// Cache for Gemini responses
interface GeminiCache {
  config: any | null;
  configTimestamp: number;
  responses: Record<string, any>;
}

// Initialize cache
const geminiCache: GeminiCache = {
  config: null,
  configTimestamp: 0,
  responses: {}
};

// Cache TTL in milliseconds (30 seconds for config, 5 minutes for responses)
const CONFIG_CACHE_TTL = 30000;
const RESPONSE_CACHE_TTL = 300000;

// Track the last time we logged about using cached config
let lastCachedConfigLogTime = 0;
const LOG_INTERVAL = 60000; // Only log once per minute
// Track how many times we've logged about cached config
// let cachedConfigLogCount = 0; // Unused variable commented out

// Get Gemini configuration with caching
export const getGeminiConfig = async () => {
  // Check if we should use the cached config
  const now = Date.now();

  // Force a fresh fetch if we're specifically checking the enabled state
  const forceRefresh = sessionStorage.getItem('force_gemini_config_refresh') === 'true';
  if (forceRefresh) {
    console.log('Forcing fresh Gemini config fetch');
    sessionStorage.removeItem('force_gemini_config_refresh');
    // Clear the cache
    geminiCache.config = null;
    geminiCache.configTimestamp = 0;
  } else if (geminiCache.config && now - geminiCache.configTimestamp < CONFIG_CACHE_TTL) {
    // Only log occasionally to avoid console spam
    if (now - lastCachedConfigLogTime > LOG_INTERVAL) {
      console.log('Using cached Gemini config');
      lastCachedConfigLogTime = now;
    }
    return geminiCache.config;
  }

  // Use debouncing to prevent multiple rapid requests
  if (!stateManager.debounce('gemini_config', 5000)) { // Reduced from 10000 to 5000ms for faster response
    console.log('Debouncing Gemini config request');

    // If we have a cached config, return it even if it's expired
    if (geminiCache.config) {
      // Don't log this to reduce console spam
      return geminiCache.config;
    }

    // If no cache exists, return a default config
    const defaultConfig = {
      status: true,
      message: 'Using default Gemini configuration (debounced)',
      data: {
        config: {
          enabled: false, // Default to disabled for safety
          apiKey: '****',
          model: 'gemini-2.0-flash',
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

    // Cache this default config to prevent future requests
    geminiCache.config = defaultConfig;
    geminiCache.configTimestamp = now;

    return defaultConfig;
  }

  try {
    // Reset the log counter when making a new request
    // cachedConfigLogCount = 0; // Variable commented out as unused

    // Make the API request with a longer cache TTL
    const response = await apiRequest('/gemini/config', {}, 10000, CONFIG_CACHE_TTL);

    // Cache the response
    geminiCache.config = response;
    geminiCache.configTimestamp = now;

    return response;
  } catch (error) {
    console.error('Error fetching Gemini config:', error);

    // If we have a cached config, return it as fallback
    if (geminiCache.config) {
      return geminiCache.config;
    }

    // Return a default config instead of throwing an error
    return {
      status: true,
      message: 'Using default Gemini configuration (error fallback)',
      data: {
        config: {
          enabled: false,
          apiKey: '****',
          model: 'gemini-1.5-pro',
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          instructions: 'You are a helpful AI assistant.',
          autoReplyEnabled: false,
          autoReplyTrigger: '!ai'
        }
      }
    };
  }
};

// Update Gemini configuration with SPA-friendly approach
export const updateGeminiConfig = async (config: any) => {
  // Set a flag to prevent navigation during this critical API call
  const originalBeforeUnload = window.onbeforeunload;
  window.onbeforeunload = (e) => {
    e.preventDefault();
    e.returnValue = '';
    return '';
  };

  // Set a specific flag for this request
  sessionStorage.setItem('gemini_update_config_in_progress', 'true');

  // Set processing state to prevent UI flickering
  stateManager.setProcessing(true);

  try {
    // Clear the config cache
    geminiCache.config = null;

    // Use a much shorter debounce time for config updates to improve user experience
    // We still want to prevent accidental double-clicks but not block intentional saves
    if (!stateManager.debounce('gemini_update_config', 1000)) {
      console.log('Debouncing Gemini config update request');
      // Instead of throwing an error, return a friendly response
      return {
        status: true, // Return success to avoid showing error message
        message: 'Your settings are being saved...',
        data: {
          config: config // Return the same config that was passed in
        }
      };
    }

    // Make the API request with additional headers to prevent page reloads
    const response = await apiRequest('/gemini/config', {
      method: 'POST',
      body: JSON.stringify(config),
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }, 15000); // Longer timeout for config updates

    return response;
  } catch (error) {
    console.error('Error updating Gemini config:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to update configuration',
    };
  } finally {
    // Clear the navigation prevention
    window.onbeforeunload = originalBeforeUnload;

    // Clear the specific flag
    sessionStorage.removeItem('gemini_update_config_in_progress');

    // Clear processing state after a delay
    setTimeout(() => {
      stateManager.setProcessing(false);
    }, 300);
  }
};

// Track how many times we've logged about debouncing generate requests
let debounceGenerateLogCount = 0;
const MAX_DEBOUNCE_LOGS = 3; // Only log the first 3 times

// Track if we're currently generating a response
let isGeneratingResponse = false;
let generationStartTime = 0;

// Generate response from Gemini with improved handling and stability
export const generateResponse = async (prompt: string, history: any[] = []) => {
  const now = Date.now();

  // If we're already generating a response and it's been less than 5 seconds, return a debounce message
  if (isGeneratingResponse && now - generationStartTime < 5000) {
    return {
      status: false,
      message: 'A response is already being generated',
      data: {
        response: "I'm already processing your previous request. Please wait a moment."
      }
    };
  }

  // Mark that we're generating a response
  isGeneratingResponse = true;
  generationStartTime = now;

  // Use a local variable to track if we need to clean up
  let needsCleanup = true;

  // Add stability class immediately
  document.body.classList.add('gemini-chat-active');

  // Set processing state to prevent UI flickering
  stateManager.setProcessing(true);

  // Disable smooth scrolling temporarily to prevent visual glitches
  document.documentElement.style.scrollBehavior = 'auto';

  try {
    // Create a cache key based on the prompt and history
    const cacheKey = `${prompt}_${JSON.stringify(history).slice(0, 100)}`;

    // Check if we have a cached response
    if (geminiCache.responses[cacheKey] &&
        geminiCache.responses[cacheKey].timestamp > Date.now() - RESPONSE_CACHE_TTL) {
      console.log('Using cached Gemini response');
      return geminiCache.responses[cacheKey].data;
    }

    // Use debouncing to prevent multiple rapid requests
    if (!stateManager.debounce('gemini_generate', 5000)) { // Increased from 2000 to 5000ms
      // Only log a limited number of times to avoid console spam
      if (debounceGenerateLogCount < MAX_DEBOUNCE_LOGS) {
        console.log('Debouncing Gemini generate request');
        debounceGenerateLogCount++;

        // If we've reached the limit, log a final message
        if (debounceGenerateLogCount === MAX_DEBOUNCE_LOGS) {
          console.log('Further "Debouncing Gemini generate request" messages will be suppressed');
        }
      }

      // Return a friendly error response instead of throwing an error
      return {
        status: false,
        message: 'Please wait a moment before sending another message.',
        data: {
          response: "I'm processing too many requests right now. Please wait a moment before sending another message."
        }
      };
    }

    // Reset the log counter when making a new request
    debounceGenerateLogCount = 0;

    // Set a flag to prevent navigation during this critical API call
    const originalBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // Set a specific flag for this request
    sessionStorage.setItem('gemini_generate_in_progress', 'true');

    try {
      // Make the API request with additional options to prevent page reloads
      const response = await apiRequest('/gemini/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt, history }),
        // Add headers to prevent any form submissions from causing page reloads
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
          'Content-Type': 'application/json', // Explicitly set content type
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }, 30000); // Longer timeout for generation

      return response;
    } finally {
      // Clear the navigation prevention
      window.onbeforeunload = originalBeforeUnload;

      // Clear the specific flag
      sessionStorage.removeItem('gemini_generate_in_progress');
    }

    // Note: The code below is unreachable due to the early return in the try-finally block
    // This is kept for reference only and will be removed in a future update
    console.log('Unreachable code in generateResponse');
    return null;
  } catch (error) {
    console.error('Error generating Gemini response:', error);

    // Return a friendly error response instead of throwing an error
    return {
      status: false,
      message: 'Failed to generate response',
      data: {
        response: "I'm sorry, I encountered an error while processing your request. Please try again later."
      }
    };
  } finally {
    if (needsCleanup) {
      // Use a safer approach to clean up
      const cleanup = () => {
        // Reset the generating response flag
        isGeneratingResponse = false;

        // Only clear processing state if we set it
        if (stateManager.isProcessing()) {
          stateManager.setProcessing(false);
        }

        // Re-enable smooth scrolling
        if (document.documentElement.style.scrollBehavior === 'auto') {
          document.documentElement.style.scrollBehavior = '';
        }
      };

      // Use requestAnimationFrame for better performance and to avoid race conditions
      requestAnimationFrame(() => {
        cleanup();
      });
    }
  }
};

// Test Gemini API connection with SPA-friendly approach
export const testGeminiConnection = async () => {
  // Set a flag to prevent navigation during this critical API call
  const originalBeforeUnload = window.onbeforeunload;
  window.onbeforeunload = (e) => {
    e.preventDefault();
    e.returnValue = '';
    return '';
  };

  // Set a specific flag for this request
  sessionStorage.setItem('gemini_test_in_progress', 'true');

  // Set processing state to prevent UI flickering
  stateManager.setProcessing(true);

  try {
    // Use debouncing to prevent multiple rapid requests
    if (!stateManager.debounce('gemini_test', 5000)) {
      console.log('Debouncing Gemini test request');
      throw new Error('Please wait a moment before testing again.');
    }

    // Make the API request with additional headers to prevent page reloads
    const response = await apiRequest('/gemini/test', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }, 15000);

    return response;
  } catch (error) {
    console.error('Error testing Gemini connection:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to test connection',
    };
  } finally {
    // Clear the navigation prevention
    window.onbeforeunload = originalBeforeUnload;

    // Clear the specific flag
    sessionStorage.removeItem('gemini_test_in_progress');

    // Clear processing state after a delay
    setTimeout(() => {
      stateManager.setProcessing(false);
    }, 300);
  }
};

// Validate Gemini API key with improved SPA-friendly approach
export const validateGeminiApiKey = async (apiKey: string) => {
  // Set a flag to prevent navigation during this critical API call
  const originalBeforeUnload = window.onbeforeunload;
  window.onbeforeunload = (e) => {
    e.preventDefault();
    e.returnValue = '';
    return '';
  };

  // Set a specific flag for this request
  sessionStorage.setItem('gemini_validate_in_progress', 'true');

  // Set processing state to prevent UI flickering
  stateManager.setProcessing(true);

  try {
    // Show a warning message about API key configuration change
    console.warn('API key validation attempted from frontend. Note: API keys can now only be set via the .env file.');

    // Clean the API key (remove whitespace, quotes, etc.)
    const cleanedApiKey = apiKey.trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');

    // Completely bypass debounce for API key validation
    // This ensures users can validate their API key without any throttling
    console.log('Proceeding with Gemini API key validation without debounce');

    // Make the API request with additional headers to prevent page reloads
    const response = await apiRequest('/gemini/validate-key', {
      method: 'POST',
      body: JSON.stringify({ apiKey: cleanedApiKey }),
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }, 20000, 0); // Increase timeout for API key validation and disable caching

    // Log the response for debugging
    console.log('Gemini API key validation response:', {
      status: response.status,
      message: response.message,
      hasData: !!response.data
    });

    // Add a note about .env configuration to the response
    if (response.status) {
      response.message = 'API key is valid, but remember it can only be set via the .env file.';
    }

    return response;
  } catch (error) {
    console.error('Error validating Gemini API key:', error);

    // Return a more detailed error response
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to validate API key',
      data: {
        details: error instanceof Error ? error.stack : 'Unknown error'
      }
    };
  } finally {
    // Clear the navigation prevention
    window.onbeforeunload = originalBeforeUnload;

    // Clear the specific flag
    sessionStorage.removeItem('gemini_validate_in_progress');

    // Clear processing state after a delay
    setTimeout(() => {
      stateManager.setProcessing(false);
    }, 500); // Increased delay to ensure UI stability
  }
};
