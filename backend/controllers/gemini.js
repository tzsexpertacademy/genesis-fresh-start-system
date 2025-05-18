import {
  getConfig,
  updateConfig,
  generateResponse,
  processMessage,
  validateApiKey,
  getContactHistory,
  clearContactHistory
} from '../services/gemini.js';

// Get Gemini configuration
export const getGeminiConfig = (req, res) => {
  try {
    const config = getConfig();

    // Don't send API key to frontend at all
    const safeConfig = { ...config };
    // Remove API key completely
    delete safeConfig.apiKey;

    res.json({
      status: true,
      message: 'Gemini configuration retrieved successfully',
      data: {
        config: safeConfig
      }
    });
  } catch (error) {
    console.error('Error getting Gemini config:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get Gemini configuration',
      error: error.message
    });
  }
};

// Update Gemini configuration
export const updateGeminiConfig = async (req, res) => {
  try {
    const newConfig = req.body;

    console.log('Received update request with config:', {
      ...newConfig,
      apiKey: newConfig.apiKey ?
        (newConfig.apiKey.includes('...') ? newConfig.apiKey : newConfig.apiKey.substring(0, 4) + '...') :
        'undefined'
    });
    console.log('Enabled status in request:', newConfig.enabled);

    // Always remove API key from frontend requests
    if (newConfig.apiKey) {
      console.log('API key provided in request, but will be ignored. API keys can only be set via .env file.');
      delete newConfig.apiKey;
    } else {
      console.log('No API key provided in update request');
    }

    // Validate custom models if provided
    if (newConfig.customModels) {
      // Ensure each custom model has required fields
      for (const model of newConfig.customModels) {
        if (!model.value || !model.label) {
          return res.status(400).json({
            status: false,
            message: 'Custom models must have both value and label properties'
          });
        }
      }
    }

    // PERBAIKAN RADIKAL: Selalu gunakan status enabled dari request
    // Ini akan memastikan nilai enabled dari frontend selalu digunakan
    if (newConfig.enabled !== undefined) {
      console.log('FORCE setting enabled status to:', newConfig.enabled);

      // Pastikan nilai enabled selalu dipertahankan
      newConfig.forceEnabled = true;
    }

    const config = await updateConfig(newConfig);
    console.log('Config after update - enabled:', config.enabled);

    // Don't send API key to frontend at all
    const safeConfig = { ...config };
    // Remove API key completely
    delete safeConfig.apiKey;

    res.json({
      status: true,
      message: 'Gemini configuration updated successfully',
      data: {
        config: safeConfig
      }
    });
  } catch (error) {
    console.error('Error updating Gemini config:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to update Gemini configuration',
      error: error.message
    });
  }
};

// Generate response from Gemini
export const generateGeminiResponse = async (req, res) => {
  try {
    const { prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        message: 'Prompt is required'
      });
    }

    // Log history information for debugging
    console.log(`Received request with prompt: "${prompt.substring(0, 30)}..."`);
    console.log(`History contains ${history ? history.length : 0} messages`);

    if (history && history.length > 0) {
      console.log('First message in history:', {
        role: history[0].role,
        content: history[0].content.substring(0, 30) + '...'
      });
      console.log('Last message in history:', {
        role: history[history.length - 1].role,
        content: history[history.length - 1].content.substring(0, 30) + '...'
      });
    }

    const response = await generateResponse(prompt, history || []);

    if (response.error) {
      return res.status(400).json({
        status: false,
        message: response.error
      });
    }

    // Log response information
    console.log(`Generated response: "${response.text.substring(0, 30)}..."`);
    console.log(`Returning history with ${response.history.length} messages`);

    res.json({
      status: true,
      message: 'Response generated successfully',
      data: {
        response: response.text,
        history: response.history
      }
    });
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to generate response',
      error: error.message
    });
  }
};

// Test Gemini API connection
export const testGeminiConnection = async (req, res) => {
  try {
    // Use Indonesian prompt for testing
    const response = await generateResponse('Halo, bisakah kamu memberikan pesan singkat dalam bahasa Indonesia?');

    if (response.error) {
      return res.status(400).json({
        status: false,
        message: 'Gagal terhubung ke API Gemini',
        error: response.error
      });
    }

    res.json({
      status: true,
      message: 'Berhasil terhubung ke API Gemini',
      data: {
        response: response.text
      }
    });
  } catch (error) {
    console.error('Error testing Gemini connection:', error);
    res.status(500).json({
      status: false,
      message: 'Gagal menguji koneksi Gemini',
      error: error.message
    });
  }
};

// Clear conversation history for a specific contact
export const clearGeminiHistory = async (req, res) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({
        status: false,
        message: 'Contact ID is required'
      });
    }

    console.log(`Clearing conversation history for contact: ${contactId}`);
    const success = clearContactHistory(contactId);

    if (success) {
      res.json({
        status: true,
        message: 'Conversation history cleared successfully'
      });
    } else {
      res.status(500).json({
        status: false,
        message: 'Failed to clear conversation history'
      });
    }
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to clear conversation history',
      error: error.message
    });
  }
};

// Get conversation history for a specific contact
export const getGeminiHistory = async (req, res) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({
        status: false,
        message: 'Contact ID is required'
      });
    }

    console.log(`Getting conversation history for contact: ${contactId}`);
    const history = getContactHistory(contactId);

    res.json({
      status: true,
      message: 'Conversation history retrieved successfully',
      data: {
        history
      }
    });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get conversation history',
      error: error.message
    });
  }
};

// Validate Gemini API key with improved error handling
export const validateGeminiApiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.json({
        status: false,
        message: 'API key is required'
      });
    }

    console.log('Validating Gemini API key...');
    const validationResult = await validateApiKey(apiKey);
    console.log('Validation result:', { valid: validationResult.valid, message: validationResult.message });

    if (validationResult.valid) {
      // Even if valid, do NOT update the config with the validated API key
      // API keys can only be set via .env file
      console.log('API key is valid, but not updating configuration');
      console.log('API keys can only be set via the .env file, not from the frontend');

      // Get current config for response
      const currentConfig = getConfig();

      // Return success response
      res.json({
        status: true,
        message: 'API key is valid, but not saved. API keys can only be set via the .env file.',
        data: {
          // Don't send any API key information back
          enabled: currentConfig.enabled // Send current enabled state
        }
      });
    } else {
      // Return a 200 status with status:false in the body
      // This prevents the frontend from treating it as a network error
      res.json({
        status: false,
        message: validationResult.message,
        data: {
          details: validationResult.details || null
        }
      });
    }
  } catch (error) {
    console.error('Error validating API key:', error);

    // Return a 200 status with status:false in the body
    // This prevents the frontend from treating it as a network error
    res.json({
      status: false,
      message: 'Failed to validate API key: ' + (error.message || 'Unknown error'),
      data: {
        details: error.stack || null
      }
    });
  }
};
