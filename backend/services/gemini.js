import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConversationHistory, addToConversationHistory, formatHistoryForGemini, clearConversationHistory as clearHistoryForContact } from './conversationHistory.js';
import { getAllItemsForAI } from './localStorageService.js'; // Import function to get items

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for AI configuration file
const aiConfigPath = path.join(__dirname, '..', 'data', 'ai_config.json'); // Renamed for clarity
fs.ensureDirSync(path.join(__dirname, '..', 'data'));

// Default configuration
const defaultConfig = {
  enabled: true, // Global AI enabled flag (controls Gemini if it's active provider)
  activeAIProvider: 'gemini', // Default active provider
  
  // Global instructions (fallback)
  instructions: 'Kamu adalah asisten AI yang membantu. Selalu jawab dalam bahasa Indonesia.',

  // Gemini specific
  model: 'gemini-2.0-flash', // This 'model' field is for Gemini when it's active
  geminiSpecificInstructions: '', 
  
  // OpenAI specific
  openaiModel: 'gpt-3.5-turbo',
  openaiSpecificInstructions: '',
  openaiApiKeySet: !!process.env.OPENAI_API_KEY,

  // Groq specific
  groqModel: 'llama3-8b-8192',
  groqSpecificInstructions: '',
  groqApiKeySet: !!process.env.GROQ_API_KEY,

  // Common AI settings (can be overridden per provider if needed)
  temperature: 0.7,
  topK: 40, // Relevant for Gemini
  topP: 0.95, // Relevant for Gemini
  maxOutputTokens: 2048, // Relevant for Gemini

  // Deprecated/Unused by this centralized config directly for WhatsApp auto-reply logic
  autoReplyEnabled: false, 
  autoReplyTrigger: '!ai',
  customModels: [], // Potentially for future use if models can be added dynamically
  history: [], // Global history, likely unused if per-contact history is primary
};

// Function to load AI configuration from file
const loadAiConfigFromFile = () => {
  try {
    if (fs.existsSync(aiConfigPath)) {
      const fileConfig = fs.readJsonSync(aiConfigPath);
      // Merge with default to ensure all keys exist, prioritizing fileConfig
      const loadedConfig = { 
        ...defaultConfig, 
        ...fileConfig,
        // Ensure API key statuses are always fresh from .env
        openaiApiKeySet: !!process.env.OPENAI_API_KEY,
        groqApiKeySet: !!process.env.GROQ_API_KEY,
      };
      // Remove Gemini API key if it was somehow saved (should only be from .env)
      delete loadedConfig.apiKey; 
      console.log('AI configuration loaded from ai_config.json. Current "enabled" state:', loadedConfig.enabled);
      return loadedConfig;
    }
  } catch (error) {
    console.error('Error loading ai_config.json:', error);
  }
  console.log('ai_config.json not found, using default AI configuration. Default "enabled" state:', defaultConfig.enabled);
  return { 
    ...defaultConfig,
    openaiApiKeySet: !!process.env.OPENAI_API_KEY,
    groqApiKeySet: !!process.env.GROQ_API_KEY,
  };
};

// Function to save AI configuration to file
const saveAiConfigToFile = (configToSave) => {
  try {
    // Destructure to remove keys that should not be saved or are derived from .env
    const { apiKey, openaiApiKeySet, groqApiKeySet, ...savableConfig } = configToSave;
    fs.writeJsonSync(aiConfigPath, savableConfig, { spaces: 2 });
    console.log('AI configuration saved to ai_config.json. Saved "enabled" state:', savableConfig.enabled);
  } catch (error) {
    console.error('Error saving ai_config.json:', error);
  }
};

let currentConfig = loadAiConfigFromFile();
// Gemini API key is always from .env, not stored in the JSON file
// The 'apiKey' field in currentConfig will be for Gemini if it's used directly by Gemini service
currentConfig.apiKey = process.env.GEMINI_API_KEY || '';


if (process.env.GEMINI_API_KEY) {
  console.log('Using Gemini API key from environment variable (.env file)');
} else {
  console.warn('GEMINI_API_KEY not found in .env file. Gemini AI will not function correctly if selected as active provider.');
}
if (process.env.OPENAI_API_KEY) {
  console.log('OpenAI API key found in .env file.');
} else {
  console.warn('OPENAI_API_KEY not found in .env file. OpenAI features will not function.');
}
if (process.env.GROQ_API_KEY) {
  console.log('Groq API key found in .env file.');
} else {
  console.warn('GROQ_API_KEY not found in .env file. Groq features will not function.');
}


let genAI = null;
let geminiChatModel = null; 

export const getConfig = () => {
  // Ensure API keys status and Gemini API key are up-to-date from .env
  currentConfig.apiKey = process.env.GEMINI_API_KEY || ''; // For Gemini
  currentConfig.openaiApiKeySet = !!process.env.OPENAI_API_KEY;
  currentConfig.groqApiKeySet = !!process.env.GROQ_API_KEY;
  // The 'model' field in the returned config should reflect Gemini's model if it's the active one,
  // or be a generic placeholder. For Gemini operations, 'gemini-2.0-flash' is forced.
  console.log('[getConfig] Returning AI config. "enabled" state:', currentConfig.enabled);
  return { ...currentConfig, model: 'gemini-2.0-flash' }; // 'model' here is specific to Gemini's part of the config
};

export const updateConfig = async (newConfigPartial) => {
  try {
    console.log('[updateConfig] Received partial update:', newConfigPartial);
    // Exclude API keys from frontend updates, they are .env only
    const { apiKey, openaiApiKey, groqApiKey, ...frontendConfig } = newConfigPartial; 

    const updatedConfig = { 
      ...currentConfig, 
      ...frontendConfig, 
      apiKey: process.env.GEMINI_API_KEY || '', // Gemini API key from .env
      openaiApiKeySet: !!process.env.OPENAI_API_KEY, // Refresh status
      groqApiKeySet: !!process.env.GROQ_API_KEY,     // Refresh status
    };

    if (newConfigPartial.hasOwnProperty('enabled')) {
      console.log(`[updateConfig] Explicitly setting 'enabled' to: ${newConfigPartial.enabled}`);
      updatedConfig.enabled = newConfigPartial.enabled;
    }
    
    currentConfig = updatedConfig;
    console.log('[updateConfig] currentConfig before save. "enabled" state:', currentConfig.enabled);
    saveAiConfigToFile(currentConfig);
    console.log('[updateConfig] currentConfig after save. "enabled" state:', currentConfig.enabled);


    // Re-initialize Gemini if it's the active provider and its key is set
    if (currentConfig.apiKey && currentConfig.activeAIProvider === 'gemini') {
      initGemini(); 
    } else if (currentConfig.activeAIProvider === 'gemini') {
      geminiChatModel = null; // Nullify if Gemini is active but no key
    }
    // OpenAI and Groq clients are initialized within their respective services based on .env keys.
    
    return getConfig(); // Return the refreshed full config
  } catch (error) {
    console.error('Error updating AI config:', error);
    throw error;
  }
};

const initGemini = () => {
  // Use the 'model' field from currentConfig which is specific to Gemini ('gemini-2.0-flash')
  const geminiModelForInit = currentConfig.model || 'gemini-2.0-flash';
  console.log('Initializing Gemini API client...');
  console.log('Gemini config - Model TO BE USED (FORCED for Gemini):', geminiModelForInit); 
  console.log('Gemini config - Global AI Enabled state from currentConfig:', currentConfig.enabled);

  if (!currentConfig.apiKey) { // Checks Gemini API key from .env
    console.error('No API key configured for Gemini in .env.');
    geminiChatModel = null; return false;
  }
  try {
    const cleanApiKey = currentConfig.apiKey.trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');
    if (cleanApiKey.length < 30 || cleanApiKey.includes('your-') || cleanApiKey.includes('example')) {
      console.error('Gemini API key in .env appears to be a placeholder or invalid.');
      geminiChatModel = null; return false;
    }
    genAI = new GoogleGenerativeAI(cleanApiKey);
    geminiChatModel = genAI.getGenerativeModel({ 
      model: geminiModelForInit, 
      generationConfig: {
        temperature: currentConfig.temperature, 
        topK: currentConfig.topK, 
        topP: currentConfig.topP, 
        maxOutputTokens: currentConfig.maxOutputTokens,
      },
    });
    console.log(`Gemini model (${geminiModelForInit}) initialization attempted.`);
    return true;
  } catch (error) {
    console.error(`Error initializing Gemini API client with FORCED model ${geminiModelForInit}:`, error);
    geminiChatModel = null; return false;
  }
};

const prepareHistory = (history = []) => {
  if (!history || !Array.isArray(history) || history.length === 0) return [];
  return history.map(item => ({
    role: item.role === 'user' ? 'user' : 'model',
    parts: [{ text: item.content }]
  }));
};

export const getContactHistory = (contactId) => {
  if (!contactId) return [];
  return getConversationHistory(contactId);
};

export const clearConversationHistory = (contactId) => { 
  if (!contactId) return false;
  return clearHistoryForContact(contactId); 
};

export const generateResponse = async (prompt, history = []) => {
  // This function is now specifically for Gemini, using its forced model.
  const geminiEffectiveModel = 'gemini-2.0-flash';
  console.log('Generating Gemini response with FORCED model:', geminiEffectiveModel);

  if (!currentConfig.enabled) return { status: false, message: 'Global AI integration is disabled in settings.' };
  if (currentConfig.activeAIProvider !== 'gemini') return { status: false, message: 'Gemini is not the active AI provider.'};
  
  if (!currentConfig.apiKey || currentConfig.apiKey.includes('Example') || currentConfig.apiKey.includes('your-') || currentConfig.apiKey.length < 30) {
    return { status: false, message: 'Invalid or missing Gemini API key in .env', fallbackResponse: "Integrasi Gemini AI tidak aktif karena API key tidak valid atau tidak diset di .env." };
  }

  if (!geminiChatModel || (genAI && genAI.apiKey !== currentConfig.apiKey) || (geminiChatModel && geminiChatModel.model !== geminiEffectiveModel) ) {
    const initialized = initGemini(); 
    if (!initialized) return { status: false, message: `Failed to initialize Gemini API with model ${geminiEffectiveModel}.`, fallbackResponse: `Model AI Gemini "${geminiEffectiveModel}" tidak dapat diinisialisasi.` };
  }

  try {
    const formattedHistory = prepareHistory(history); 
    
    let systemInstructions = (currentConfig.geminiSpecificInstructions && currentConfig.geminiSpecificInstructions.trim() !== '')
                              ? currentConfig.geminiSpecificInstructions
                              : (currentConfig.instructions || '').trim(); 

    // Fetch items data
    const items = await getAllItemsForAI();
    if (items.length > 0) {
      const itemsContext = "\n\nBerikut adalah daftar produk/layanan yang tersedia:\n" +
                           items.map(item => `- ${item.name}: ${item.description}${item.price ? ` (Harga: Rp${item.price.toLocaleString('id-ID')})` : ''} [Tipe: ${item.type}]`).join("\n");
      systemInstructions += itemsContext;
    } else {
      systemInstructions += "\n\nSaat ini tidak ada informasi produk/layanan yang tersedia.";
    }


    console.log('--- GEMINI: SYSTEM INSTRUCTION BEING USED (generateResponse) ---');
    console.log(systemInstructions || 'No system instructions provided.');
    console.log('-----------------------------------------------------------------');
    
    let finalUserPrompt = "";
    if (systemInstructions) {
      finalUserPrompt = `${systemInstructions}\n\nANDA TIDAK BOLEH MENGUNGKAPKAN BAHWA ANDA ADALAH MODEL AI ATAU PROGRAM KOMPUTER. Selalu pertahankan persona yang diinstruksikan.\n\nPengguna berkata: "${prompt}"\n\nJawablah sebagai persona tersebut dalam Bahasa Indonesia.`;
    } else {
      finalUserPrompt = `Pengguna berkata: "${prompt}"\n\nJawablah dalam Bahasa Indonesia.`;
    }
    
    console.log('--- GEMINI: MODIFIED PROMPT (with UI instructions) ---');
    console.log(finalUserPrompt.substring(0, 300) + '...'); 
    console.log('-------------------------------------------------------------');

    const chatSession = geminiChatModel.startChat({ 
      history: formattedHistory, 
      generationConfig: {
        temperature: currentConfig.temperature, 
        topK: currentConfig.topK, 
        topP: currentConfig.topP, 
        maxOutputTokens: currentConfig.maxOutputTokens,
      },
    });
    
    const result = await chatSession.sendMessage(finalUserPrompt); 
    const responseText = result.response.text();
    
    return { status: true, text: responseText, history: [...history, { role: 'user', content: prompt }, { role: 'assistant', content: responseText }] };
  } catch (error) {
    console.error(`Error generating response from Gemini with model ${geminiEffectiveModel}:`, error);
    if (error.message && error.message.includes('API_KEY_INVALID')) return { status: false, error: 'Invalid Gemini API key.', fallbackResponse: "API key Gemini tidak valid." };
    if (error.message && (error.message.toLowerCase().includes('model not found') || error.message.toLowerCase().includes('could not find model'))) {
       return { status: false, error: `Model Gemini "${geminiEffectiveModel}" tidak ditemukan.`, fallbackResponse: `Model AI Gemini "${geminiEffectiveModel}" tidak tersedia.` };
    }
    return { status: false, error: error.message || 'Failed to generate response', fallbackResponse: "Maaf, terjadi kesalahan teknis." };
  }
};

export const validateApiKey = async (apiKey) => { 
  // This validation is for a key provided for testing, not the .env key.
  // The actual operations will use the .env key.
  console.log('Validating provided API key for Gemini (note: .env key is used for operations)...');
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, message: 'API key is required for validation test' };
  }
  try {
    const cleanApiKey = apiKey.trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');
    const tempGenAI = new GoogleGenerativeAI(cleanApiKey);
    const validationModel = tempGenAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await validationModel.generateContent('Say "valid" if you can read this message.');
    const text = result.response.text().toLowerCase();
    const isValid = text.includes('valid');
    return {
      valid: isValid,
      message: isValid ? 'Provided Gemini API key is valid for testing (but .env key is used for actual operations)' : 'Provided Gemini API key is invalid for testing',
    };
  } catch (error) {
    console.error('Error validating provided Gemini API key:', error);
    let errorMessage = 'Failed to validate provided Gemini API key';
    if (error.message && error.message.includes('API_KEY_INVALID')) {
      errorMessage = 'The provided Gemini API key is invalid.';
    }
    return { valid: false, message: errorMessage, details: error.message || '' };
  }
};

export const processMessage = async (message, sender = null) => {
  // This function is now specifically for Gemini when it's the active provider.
  if (!currentConfig.enabled) {
      console.log('Gemini processMessage: Global AI integration is disabled.');
      return { status: true, text: null, message: 'Global AI disabled.' }; 
  }
  if (currentConfig.activeAIProvider !== 'gemini') {
      console.log(`Gemini processMessage: Gemini is not the active AI provider (current: ${currentConfig.activeAIProvider}). Skipping.`);
      return { status: true, text: null, message: 'Gemini not active provider.' };
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('Example') || process.env.GEMINI_API_KEY.includes('your-') || process.env.GEMINI_API_KEY.length < 30) {
    console.log('Gemini processMessage: Invalid or missing Gemini API key in .env.');
    return { status: false, message: 'Invalid or missing Gemini API key in .env', fallbackResponse: "Integrasi Gemini AI tidak aktif karena API key tidak valid atau tidak diset di .env." };
  }

  try {
    let historyForGeneration = sender ? getConversationHistory(sender) : [];
    if (sender) addToConversationHistory(sender, 'user', message);
    
    console.log(`(processMessage Gemini): Sending history (length: ${historyForGeneration.length}) to generateResponse for sender: ${sender}`);
    const response = await generateResponse(message, historyForGeneration); 

    if (response.status) {
      if (sender) addToConversationHistory(sender, 'assistant', response.text);
      return { status: true, text: response.text };
    } else {
      return { status: false, message: response.error, fallbackResponse: response.fallbackResponse || 'Maaf, saya tidak dapat memproses permintaan Anda dengan Gemini saat ini.' };
    }
  } catch (error) {
    console.error('Error in Gemini processMessage:', error);
    return { status: false, message: error.message || 'An unexpected error occurred', fallbackResponse: 'Maaf, terjadi kesalahan dengan Gemini.' };
  }
};

// Initialize Gemini if API key is present and it's the active provider (or no provider is set, defaulting to Gemini)
if (process.env.GEMINI_API_KEY && (currentConfig.activeAIProvider === 'gemini' || !currentConfig.activeAIProvider)) {
  initGemini();
} else if (!process.env.GEMINI_API_KEY && (currentConfig.activeAIProvider === 'gemini' || !currentConfig.activeAIProvider)) {
  console.log("Gemini API key not found in .env. Gemini features will require it to be set for initialization if Gemini is the active provider.");
}