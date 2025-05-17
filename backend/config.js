import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the directory name using ES module compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to config file
const configFilePath = path.join(__dirname, 'config.json');

// Default configuration
const defaultConfig = {
  autoReply: {
    enabled: false,
    message: 'This is an automated reply. We will get back to you soon.'
  },
  limits: {
    maxMessages: 100,
    maxMediaSize: 5 * 1024 * 1024 // 5 MB
  },
  blocklist: [],
  apiKey: process.env.API_KEY || ''
};

// Load configuration from file if it exists
function loadConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const configData = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      
      // Merge with default config to ensure all required fields exist
      return { ...defaultConfig, ...configData };
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
  }

  return defaultConfig;
}

// Save configuration to file
function saveConfig(config) {
  try {
    // Create a safe clone of the config
    const safeConfig = JSON.parse(JSON.stringify(config));
    
    // Always use environment variable for API key if available
    if (process.env.API_KEY) {
      safeConfig.apiKey = process.env.API_KEY;
    }

    fs.writeFileSync(configFilePath, JSON.stringify(safeConfig, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
}

// Get config merging with environment variables
function getConfig() {
  const config = loadConfig();
  
  // Override with environment variables if available
  if (process.env.API_KEY) {
    config.apiKey = process.env.API_KEY;
  }
  
  // Prefer Gemini API key from environment variable if available
  if (process.env.GEMINI_API_KEY) {
    config.geminiApiKey = process.env.GEMINI_API_KEY;
  }
  
  return config;
}

// Update config but preserve environment variable values
function updateConfig(newConfig) {
  const currentConfig = loadConfig();
  const updatedConfig = { ...currentConfig, ...newConfig };
  
  // Always prioritize environment variables
  if (process.env.API_KEY) {
    updatedConfig.apiKey = process.env.API_KEY;
  }
  
  saveConfig(updatedConfig);
  return updatedConfig;
}

// Initialize config file if it doesn't exist
if (!fs.existsSync(configFilePath)) {
  saveConfig(defaultConfig);
}

export { getConfig, updateConfig };
