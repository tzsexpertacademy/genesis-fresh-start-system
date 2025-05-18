import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.join(__dirname, '..', 'data');
fs.ensureDirSync(dataDir);

// Conversation history file
const historyFile = path.join(dataDir, 'conversation_history.json');

// Ensure history file exists
if (!fs.existsSync(historyFile)) {
  fs.writeJsonSync(historyFile, {}, { spaces: 2 });
}

// Maximum number of messages to keep per contact
const MAX_HISTORY_LENGTH = 10;

// Maximum age of history in milliseconds (7 days)
const MAX_HISTORY_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Get conversation history for a specific contact
 * @param {string} contactId - Contact identifier (phone number)
 * @returns {Array} - Array of conversation history messages
 */
export const getConversationHistory = (contactId) => {
  try {
    if (!contactId) {
      console.log('No contact ID provided for conversation history');
      return [];
    }

    // Normalize contact ID (remove @s.whatsapp.net if present)
    const normalizedContactId = contactId.replace(/@s\.whatsapp\.net$/i, '');
    console.log(`Getting conversation history for normalized contact ID: ${normalizedContactId}`);

    // Read history file
    const historyData = fs.readJsonSync(historyFile);
    console.log(`History data keys: ${Object.keys(historyData).join(', ') || 'none'}`);

    // Get history for this contact or return empty array
    const contactHistory = historyData[normalizedContactId] || [];
    console.log(`Found ${contactHistory.length} history entries for contact ${normalizedContactId}`);

    // Filter out old messages
    const now = Date.now();
    const recentHistory = contactHistory.filter(msg => {
      // If message has no timestamp or timestamp is too old, filter it out
      if (!msg.timestamp) return true; // Keep messages without timestamp for backward compatibility
      const msgTime = new Date(msg.timestamp).getTime();
      return (now - msgTime) < MAX_HISTORY_AGE;
    });

    // If we filtered out messages, update the history file
    if (recentHistory.length !== contactHistory.length) {
      console.log(`Filtered out ${contactHistory.length - recentHistory.length} old messages`);
      historyData[normalizedContactId] = recentHistory;
      fs.writeJsonSync(historyFile, historyData, { spaces: 2 });
    }

    console.log(`Returning ${recentHistory.length} history entries for Gemini`);
    return recentHistory;
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
};

/**
 * Add a message to conversation history
 * @param {string} contactId - Contact identifier (phone number)
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 * @returns {Array} - Updated conversation history
 */
export const addToConversationHistory = (contactId, role, content) => {
  try {
    if (!contactId) {
      console.log('No contact ID provided for adding to conversation history');
      return [];
    }

    // Normalize contact ID (remove @s.whatsapp.net if present)
    const normalizedContactId = contactId.replace(/@s\.whatsapp\.net$/i, '');
    console.log(`Adding message to history for normalized contact ID: ${normalizedContactId}`);
    console.log(`Message role: ${role}, content preview: ${content.substring(0, 30)}...`);

    // Read history file
    const historyData = fs.readJsonSync(historyFile);

    // Get history for this contact or create new array
    const contactHistory = historyData[normalizedContactId] || [];
    console.log(`Current history length for ${normalizedContactId}: ${contactHistory.length}`);

    // Add new message with timestamp
    const newMessage = {
      role,
      content,
      timestamp: new Date().toISOString()
    };

    // Add to history and limit length
    const updatedHistory = [...contactHistory, newMessage].slice(-MAX_HISTORY_LENGTH);
    console.log(`New history length: ${updatedHistory.length}`);

    // Update history file
    historyData[normalizedContactId] = updatedHistory;
    fs.writeJsonSync(historyFile, historyData, { spaces: 2 });
    console.log(`Successfully saved updated history for ${normalizedContactId}`);

    return updatedHistory;
  } catch (error) {
    console.error('Error adding to conversation history:', error);
    return [];
  }
};

/**
 * Clear conversation history for a specific contact
 * @param {string} contactId - Contact identifier (phone number)
 * @returns {boolean} - Success status
 */
export const clearConversationHistory = (contactId) => {
  try {
    // Normalize contact ID (remove @s.whatsapp.net if present)
    const normalizedContactId = contactId.replace('@s.whatsapp.net', '');

    // Read history file
    const historyData = fs.readJsonSync(historyFile);

    // Delete history for this contact
    delete historyData[normalizedContactId];

    // Update history file
    fs.writeJsonSync(historyFile, historyData, { spaces: 2 });

    return true;
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    return false;
  }
};

/**
 * Clear all conversation history
 * @returns {boolean} - Success status
 */
export const clearAllConversationHistory = () => {
  try {
    // Write empty object to history file
    fs.writeJsonSync(historyFile, {}, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error clearing all conversation history:', error);
    return false;
  }
};

/**
 * Format conversation history for Gemini API
 * @param {Array} history - Conversation history
 * @returns {Array} - Formatted history for Gemini API
 */
export const formatHistoryForGemini = (history) => {
  if (!history || !Array.isArray(history) || history.length === 0) return [];

  // Convert our history format to Gemini's format
  return history.map(item => ({
    role: item.role === 'user' ? 'user' : 'model',
    parts: [{ text: item.content }]
  }));
};

// Clean up old history on module load
const cleanupOldHistory = () => {
  try {
    const historyData = fs.readJsonSync(historyFile);
    const now = Date.now();
    let updated = false;

    // Check each contact's history
    for (const contactId in historyData) {
      const contactHistory = historyData[contactId];
      const recentHistory = contactHistory.filter(msg => {
        if (!msg.timestamp) return true;
        const msgTime = new Date(msg.timestamp).getTime();
        return (now - msgTime) < MAX_HISTORY_AGE;
      });

      // If we filtered out messages, mark as updated
      if (recentHistory.length !== contactHistory.length) {
        historyData[contactId] = recentHistory;
        updated = true;
      }
    }

    // If any histories were updated, save the file
    if (updated) {
      fs.writeJsonSync(historyFile, historyData, { spaces: 2 });
      console.log('Cleaned up old conversation history entries');
    }
  } catch (error) {
    console.error('Error cleaning up old history:', error);
  }
};

// Run cleanup on module load
cleanupOldHistory();
