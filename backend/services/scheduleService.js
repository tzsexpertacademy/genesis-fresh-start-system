import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.join(__dirname, '..', 'data');
fs.ensureDirSync(dataDir);

// File path for scheduled messages
const scheduledMessagesFile = path.join(dataDir, 'scheduled_messages.json');

// Ensure file exists
if (!fs.existsSync(scheduledMessagesFile)) {
  fs.writeJsonSync(scheduledMessagesFile, [], { spaces: 2 });
}

/**
 * Load scheduled messages from file
 * @returns {Array} Array of scheduled message objects
 */
const loadScheduledMessages = () => {
  try {
    return fs.readJsonSync(scheduledMessagesFile);
  } catch (error) {
    console.error('Error loading scheduled messages:', error);
    return [];
  }
};

/**
 * Save scheduled messages to file
 * @param {Array} messages Array of scheduled message objects
 */
const saveScheduledMessages = (messages) => {
  try {
    fs.writeJsonSync(scheduledMessagesFile, messages, { spaces: 2 });
  } catch (error) {
    console.error('Error saving scheduled messages:', error);
  }
};

/**
 * Get all scheduled messages
 * @returns {Array} Array of scheduled message objects
 */
export const getAllScheduledMessages = () => {
  return loadScheduledMessages();
};

/**
 * Add a new scheduled message
 * @param {Object} messageData - Message data including number, message, and scheduleTime
 * @returns {Object} Added scheduled message with ID and timestamps
 */
export const addScheduledMessage = (messageData) => {
  const messages = loadScheduledMessages();

  const newMessage = {
    id: uuidv4(),
    ...messageData,
    status: 'scheduled', // 'scheduled', 'sent', 'failed'
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  messages.push(newMessage);
  saveScheduledMessages(messages);

  console.log(`[ScheduleService] Scheduled message added: ${newMessage.id} for ${newMessage.number} at ${newMessage.scheduleTime}`);

  return newMessage;
};

/**
 * Update a scheduled message status
 * @param {string} id - Message ID
 * @param {string} status - New status ('sent' or 'failed')
 * @param {string} [error=null] - Error message if status is 'failed'
 * @returns {Object|null} Updated message or null if not found
 */
export const updateScheduledMessageStatus = (id, status, error = null) => {
  const messages = loadScheduledMessages();
  const index = messages.findIndex(msg => msg.id === id);

  if (index === -1) {
    return null;
  }

  messages[index].status = status;
  messages[index].updated_at = new Date().toISOString();
  if (error) {
    messages[index].error = error;
  }

  saveScheduledMessages(messages);

  console.log(`[ScheduleService] Scheduled message status updated: ${id} to ${status}`);

  return messages[index];
};

/**
 * Delete a scheduled message
 * @param {string} id - Message ID
 * @returns {boolean} True if deleted, false if not found
 */
export const deleteScheduledMessage = (id) => {
  const messages = loadScheduledMessages();
  const initialLength = messages.length;
  const filteredMessages = messages.filter(msg => msg.id !== id);

  if (filteredMessages.length === initialLength) {
    return false; // Message not found
  }

  saveScheduledMessages(filteredMessages);

  console.log(`[ScheduleService] Scheduled message deleted: ${id}`);

  return true;
};

/**
 * Get scheduled messages that are due
 * @returns {Array} Array of scheduled message objects that are due
 */
export const getDueScheduledMessages = () => {
  const messages = loadScheduledMessages();
  const now = new Date();
  // Log current time for comparison. Server's local time and UTC time.
  console.log(`[ScheduleService] Current server time (Local): ${now.toLocaleString()}, (UTC): ${now.toISOString()}`);

  const dueMessages = messages.filter(msg => {
    if (msg.status === 'scheduled') { // Only consider messages that are still scheduled
      const scheduledTime = new Date(msg.scheduleTime); // msg.scheduleTime should be UTC ISO string
      const isDue = scheduledTime <= now;
      
      // Log details for every 'scheduled' message being checked
      console.log(`[ScheduleService] Checking Message ID: ${msg.id}`);
      console.log(`  Number: ${msg.number}`);
      console.log(`  Status: ${msg.status}`);
      console.log(`  Stored scheduleTime (UTC from JSON): ${msg.scheduleTime}`);
      console.log(`  Parsed scheduleTime (as Date object, effectively UTC): ${scheduledTime.toISOString()}`);
      console.log(`  Comparison: (Parsed ScheduleTime ${scheduledTime.toISOString()}) <= (Current Time ${now.toISOString()})? Result: ${isDue}`);
      
      return isDue;
    }
    return false;
  });

  if (dueMessages.length > 0) {
    console.log(`[ScheduleService] Found ${dueMessages.length} due messages to be processed.`);
  } else {
    console.log(`[ScheduleService] No messages are currently due.`);
  }
  return dueMessages;
};

export default {
  getAllScheduledMessages,
  addScheduledMessage,
  updateScheduledMessageStatus,
  deleteScheduledMessage,
  getDueScheduledMessages
};