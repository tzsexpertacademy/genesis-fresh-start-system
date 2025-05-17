import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
let defaultConfig = {
  enabled: true,
  apiKey: process.env.GEMINI_API_KEY || '',
  model: 'gemini-2.0-flash', // Only using gemini-2.0-flash model
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
  // Default system instructions - can be easily modified
  instructions: 'Kamu adalah asisten AI yang sangat cerdas. Selalu menjawab pertanyaan dengan bahasa Indonesia yang baik dan benar. Jawab pertanyaan dengan jelas dan informatif. Gunakan bahasa yang sopan dan ramah. Berikan jawaban yang akurat dan bermanfaat. Jika kamu tidak tahu jawabannya, katakan dengan jujur bahwa kamu tidak tahu. Jangan memberikan informasi yang salah.',
  history: []
};

// Always prioritize API key from environment variable
if (process.env.GEMINI_API_KEY) {
  console.log('Using API key from environment variable (.env file)');
  defaultConfig.apiKey = process.env.GEMINI_API_KEY;
  const maskedKey = process.env.GEMINI_API_KEY.substring(0, 4) + '...' +
                   process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 4);
  console.log('API key from .env (masked):', maskedKey);
  console.log('API key length:', process.env.GEMINI_API_KEY.length);
}

// Try to load config from file for backward compatibility, but don't use the API key
try {
  const configPath = path.join(__dirname, '..', 'config.json');
  if (fs.existsSync(configPath)) {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (fileConfig.geminiApiKey && !process.env.GEMINI_API_KEY) {
      console.log('WARNING: API key found in config.json file, but it will be ignored.');
      console.log('Please set the GEMINI_API_KEY in your .env file instead.');
    }
  }
} catch (error) {
  console.error('Error loading config file:', error);
}

// Current configuration in memory
let currentConfig = { ...defaultConfig };

// Initialize Gemini API client
let genAI = null;
let model = null;

// Get current configuration
export const getConfig = () => {
  return currentConfig;
};

// Update configuration
export const updateConfig = async (newConfig) => {
  try {
    // Create a safe copy of the new config
    const safeNewConfig = { ...newConfig };

    // Remove model from newConfig to ensure we always use gemini-2.0-flash
    if (safeNewConfig.model) {
      delete safeNewConfig.model;
    }

    // IMPORTANT: Never update the API key from frontend requests
    // Always use the API key from the .env file
    if (safeNewConfig.apiKey) {
      console.log('API key update attempted from frontend. Ignoring and using .env value instead.');
      delete safeNewConfig.apiKey;
    }

    // Always ensure we're using the API key from environment variable
    if (process.env.GEMINI_API_KEY) {
      safeNewConfig.apiKey = process.env.GEMINI_API_KEY;
    }

    // Update current config with new values
    const updatedConfig = { ...currentConfig, ...safeNewConfig };

    // Save to memory
    currentConfig = updatedConfig;

    // Re-initialize Gemini with the current API key
    initGemini();

    return currentConfig;
  } catch (error) {
    console.error('Error updating Gemini config:', error);
    throw error;
  }
};

// Initialize Gemini API client
const initGemini = () => {
  const config = getConfig();

  // FORCE ENABLE for testing
  config.enabled = true;

  console.log('Initializing Gemini API client...');
  console.log('FORCE ENABLED Gemini for initialization');
  console.log('Gemini config - enabled:', config.enabled);
  console.log('Gemini config - has API key:', !!config.apiKey);

  if (config.apiKey) {
    console.log('API key length:', config.apiKey.length);
    console.log('API key first 5 chars:', config.apiKey.substring(0, 5));
  }

  // Check if API key is available
  if (!config.apiKey) {
    console.error('No API key configured for Gemini');
    return false;
  }

  try {
    // Clean API key (remove whitespace and quotes)
    const cleanApiKey = config.apiKey.trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');

    console.log('Using cleaned API key:', cleanApiKey.substring(0, 5) + '..._Key');
    console.log('Cleaned API key length:', cleanApiKey.length);

    // Check if API key is valid format
    if (cleanApiKey.length < 30) {
      console.error('API key appears to be too short, might be invalid');
    }

    if (cleanApiKey.includes('your-') || cleanApiKey.includes('example')) {
      console.error('API key appears to be a placeholder, not a real key');
      return false;
    }

    // Initialize the API client
    console.log('Creating GoogleGenerativeAI instance...');
    genAI = new GoogleGenerativeAI(cleanApiKey);

    // Initialize the model - always use gemini-1.5-flash for better compatibility
    console.log('Initializing Gemini model: gemini-1.5-flash');
    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Use gemini-1.5-flash for better compatibility
      generationConfig: {
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
      },
    });

    console.log('Gemini model initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Gemini API client:', error);
    console.error('Error details:', error.stack);
    return false;
  }
};

// Prepare chat history for Gemini API
const prepareHistory = (history = []) => {
  if (!history || !Array.isArray(history) || history.length === 0) return [];

  // Convert our history format to Gemini's format
  return history.map(item => ({
    role: item.role === 'user' ? 'user' : 'model',
    parts: [{ text: item.content }]
  }));
};

// Format system instructions with user prompt
const formatPromptWithInstructions = (systemInstructions, userPrompt) => {
  // Clean and validate inputs
  const cleanInstructions = (systemInstructions || '').trim();
  const cleanPrompt = (userPrompt || '').trim();

  // If no system instructions, just return the user prompt
  if (!cleanInstructions) return cleanPrompt;

  // Format with system instructions first, then user prompt
  return `${cleanInstructions}\n\nUser: ${cleanPrompt}`;
};

// Generate response
export const generateResponse = async (prompt, history = []) => {
  console.log('Generating Gemini response for prompt:', prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''));
  console.log('History length:', history.length);

  // FORCE ENABLE for testing
  const config = getConfig();
  config.enabled = true;
  console.log('FORCE ENABLED Gemini for response generation');
  console.log('Gemini config for response generation - enabled:', config.enabled);
  console.log('Has API key:', !!config.apiKey);

  if (config.apiKey) {
    console.log('API key length:', config.apiKey.length);
    console.log('API key first 5 chars:', config.apiKey.substring(0, 5));
  }

  if (!config.enabled) {
    console.log('Gemini integration is disabled in config');
    return { error: 'Gemini integration is disabled' };
  }

  // Check if API key is a placeholder or example key
  if (config.apiKey.includes('Example') || config.apiKey.includes('your-') || config.apiKey.length < 30) {
    console.log('Invalid API key detected - using placeholder or example key');
    return {
      error: 'Invalid Gemini API key. Please replace the example API key in .env file with your actual API key from Google AI Studio.',
      fallbackResponse: "Untuk menggunakan Gemini, Anda perlu mendapatkan API key dari Google AI Studio dan menggantinya di file .env"
    };
  }

  // Initialize if not already initialized
  if (!model) {
    console.log('Model not initialized, initializing now...');
    const initialized = initGemini();
    if (!initialized) {
      console.log('Failed to initialize Gemini API');
      return { error: 'Failed to initialize Gemini API' };
    }
  }

  try {
    console.log('Generating response for prompt:', prompt);
    console.log('Using history with', history.length, 'messages');

    // Create a chat session with history
    const formattedHistory = prepareHistory(history);

    // Create chat session with history and system instructions
    const chatSession = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
      },
    });

    // Add system instructions as a preamble message if provided
    let systemInstructions = (config.instructions || '').trim();
    if (systemInstructions) {
      console.log('Using system instructions');
      // If we have no history, prepend system instructions to the prompt
      if (history.length === 0) {
        prompt = `${systemInstructions}\n\nUser: ${prompt}`;
      }
    }

    // Send the message to the chat session
    const result = await chatSession.sendMessage(prompt);

    // Extract the response text
    const responseText = result.response.text();
    console.log('Generated response:', responseText.substring(0, 100) + '...');

    return {
      text: responseText,
      history: [...history,
        { role: 'user', content: prompt },
        { role: 'assistant', content: responseText }
      ]
    };
  } catch (error) {
    console.error('Error generating response from Gemini:', error);
    console.error('Error details:', error.stack);

    // Check for API key errors
    if (error.message && error.message.includes('API_KEY_INVALID')) {
      return {
        error: 'Invalid Gemini API key. Please replace the API key in .env file with a valid key from Google AI Studio.',
        fallbackResponse: "Untuk menggunakan Gemini, Anda perlu mendapatkan API key yang valid dari Google AI Studio."
      };
    }

    return {
      error: error.message || 'Failed to generate response',
      fallbackResponse: "Maaf, saya sedang mengalami kesulitan teknis. Bisa Anda ulangi pertanyaannya?"
    };
  }
};

// Validate API key
export const validateApiKey = async (apiKey) => {
  console.log('Validating API key...');

  if (!apiKey || apiKey.trim() === '') {
    console.log('API key is empty or null');
    return {
      valid: false,
      message: 'API key is required'
    };
  }

  console.log('API key length:', apiKey.length);
  console.log('API key first 5 chars:', apiKey.substring(0, 5));

  try {
    // Clean API key
    const cleanApiKey = apiKey.trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');
    console.log('Cleaned API key length:', cleanApiKey.length);
    console.log('Cleaned API key first 5 chars:', cleanApiKey.substring(0, 5));

    // Check if API key is valid format
    if (cleanApiKey.length < 30) {
      console.warn('API key appears to be too short, might be invalid');
    }

    if (cleanApiKey.includes('your-') || cleanApiKey.includes('example')) {
      console.error('API key appears to be a placeholder, not a real key');
      return {
        valid: false,
        message: 'API key appears to be a placeholder, not a real key'
      };
    }

    console.log('Creating temporary GoogleGenerativeAI instance for validation...');
    // Create a temporary API client
    const tempGenAI = new GoogleGenerativeAI(cleanApiKey);

    console.log('Creating validation model with gemini-2.0-flash...');
    // Use gemini-2.0-flash model for validation
    const validationModel = tempGenAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 16,
        maxOutputTokens: 32,
      }
    });

    console.log('Sending validation prompt to Gemini...');
    // Send a simple validation prompt
    const validationPrompt = 'Say "valid" if you can read this message.';
    const result = await validationModel.generateContent(validationPrompt);
    const text = result.response.text().toLowerCase();
    console.log('Validation response:', text);

    // Check if the response contains "valid"
    const isValid = text.includes('valid');
    console.log('API key validation result:', isValid ? 'VALID' : 'INVALID');

    if (isValid) {
      console.log('API key is valid, but not updating configuration...');
      console.log('API keys can only be set via the .env file, not from the frontend');
      // Do not update config with the validated API key
      // await updateConfig({ apiKey: cleanApiKey });
    }

    return {
      valid: isValid,
      message: isValid ? 'API key is valid' : 'API key is invalid',
      apiKey: cleanApiKey
    };
  } catch (error) {
    console.error('Error validating API key:', error);
    console.error('Error details:', error.stack);

    // Provide a specific error message based on the error
    let errorMessage = 'Failed to validate API key';

    if (error.message) {
      console.log('Error message:', error.message);
      if (error.message.includes('API_KEY_INVALID')) {
        errorMessage = 'The API key is invalid. Please check it and try again.';
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'The API key does not have permission to access this resource.';
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        errorMessage = 'API quota exceeded. Please check your usage limits.';
      }
    }

    console.log('Returning error message:', errorMessage);
    return {
      valid: false,
      message: errorMessage,
      details: error.message || ''
    };
  }
};

// Process messages from WhatsApp
export const processMessage = async (message) => {
  console.log('Gemini processMessage called with message:', message.substring(0, 50) + (message.length > 50 ? '...' : ''));

  // FORCE ENABLE for testing
  const config = getConfig();
  config.enabled = true;
  console.log('FORCE ENABLED Gemini for testing');
  console.log('Gemini config status - enabled:', config.enabled, 'has API key:', !!config.apiKey);

  // Check if Gemini is enabled
  if (!config.enabled) {
    console.log('Gemini integration is disabled in config, skipping processing');
    return null;
  }

  if (!config.apiKey) {
    console.log('No Gemini API key configured, skipping processing');
    return null;
  }

  try {
    // Check if message is a command or question for AI
    const isAI = isAIRequest(message);
    console.log('Is AI request:', isAI);

    if (!isAI) {
      return null;
    }

    console.log('Processing message with Gemini...');
    // Generate response
    const response = await generateResponse(message);

    if (response.error) {
      console.error('Error generating response:', response.error);
      return response.fallbackResponse || 'Maaf, saya tidak dapat memproses permintaan Anda saat ini.';
    }

    console.log('Gemini response generated successfully:', response.text.substring(0, 50) + (response.text.length > 50 ? '...' : ''));
    return response.text;
  } catch (error) {
    console.error('Error processing message with Gemini:', error);
    console.error('Error details:', error.stack);
    return 'Maaf, terjadi kesalahan saat memproses pesan Anda.';
  }
};

// Check if a message is intended for AI
const isAIRequest = (message) => {
  console.log('Checking if message is an AI request:', message);

  if (!message || typeof message !== 'string') {
    console.log('Message is not a string, returning false');
    return false;
  }

  // For testing purposes, process all messages with Gemini
  console.log('Processing all messages with Gemini for testing');
  return true;

  /* Original implementation - commented out for testing
  // Trim and lowercase the message
  const normalizedMessage = message.trim().toLowerCase();

  // Check for AI command prefixes
  const aiPrefixes = ['ai ', '/ai ', '!ai ', '.ai ', 'ai: ', 'ai,'];
  for (const prefix of aiPrefixes) {
    if (normalizedMessage.startsWith(prefix)) {
      return true;
    }
  }

  // Check if message ends with a question mark
  if (normalizedMessage.endsWith('?')) {
    return true;
  }

  // Check if message contains question words
  const questionWords = ['apa', 'siapa', 'kapan', 'dimana', 'mengapa', 'bagaimana', 'kenapa', 'gimana', 'tolong', 'bantu'];
  for (const word of questionWords) {
    if (normalizedMessage.includes(word)) {
      return true;
    }
  }

  return false;
  */
};

// Initialize on load
initGemini();
