/**
 * MessageSyncService
 *
 * A dedicated service for synchronizing messages across the application.
 * This service ensures that messages are properly synchronized between
 * the backend, WebSocket events, and the UI components.
 */

import { InboxMessage, Contact } from '../types';

// Define event types
type EventCallback = (data: any) => void;
type EventType = 'message_added' | 'message_updated' | 'messages_synced' | 'active_chat_updated';

class MessageSyncService {
  private static instance: MessageSyncService;
  private eventListeners: Map<EventType, EventCallback[]> = new Map();
  private activeMessages: Map<string, InboxMessage[]> = new Map();
  private activeContact: Contact | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;

  // Private constructor for singleton pattern
  private constructor() {
    // Initialize event listeners map
    this.eventListeners.set('message_added', []);
    this.eventListeners.set('message_updated', []);
    this.eventListeners.set('messages_synced', []);
    this.eventListeners.set('active_chat_updated', []);

    // Start sync interval
    this.startSyncInterval();
  }

  // Get singleton instance
  public static getInstance(): MessageSyncService {
    if (!MessageSyncService.instance) {
      MessageSyncService.instance = new MessageSyncService();
    }
    return MessageSyncService.instance;
  }

  // Start sync interval with a much longer interval to prevent blinking
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Check for sync every 5 seconds instead of every second
    // This prevents the UI from blinking too frequently
    this.syncInterval = setInterval(() => {
      this.checkForSync();
    }, 5000); // Increased from 1000ms to 5000ms
  }

  // Check if sync is needed with improved debouncing
  private checkForSync(): void {
    const now = Date.now();

    // Only sync if active contact is set and it's been at least 5 seconds since last sync
    // This prevents too frequent UI updates that cause blinking
    if (this.activeContact && (now - this.lastSyncTime) >= 5000) {
      // Check if we're in the Gemini chat page
      const isGeminiChatActive = sessionStorage.getItem('gemini_chat_active') === 'true' ||
                                 sessionStorage.getItem('active_component') === 'geminiChat';

      // If we're in Gemini chat, only sync if absolutely necessary
      if (isGeminiChatActive) {
        // Check if there are any pending updates that require a sync
        const hasPendingUpdates = sessionStorage.getItem('pending_update_messages') === 'true';

        if (!hasPendingUpdates) {
          // Skip sync to prevent blinking in Gemini chat
          console.log('MessageSyncService: Skipping sync in Gemini chat to prevent blinking');
          return;
        }
      }

      this.syncActiveChat();
      this.lastSyncTime = now;
    }
  }

  // Set active contact
  public setActiveContact(contact: Contact | null): void {
    console.log('MessageSyncService: Setting active contact', contact?.phoneNumber);
    this.activeContact = contact;

    if (contact) {
      // Store current messages for this contact
      this.activeMessages.set(contact.phoneNumber, [...(contact.messages || [])]);

      // Force immediate sync
      this.syncActiveChat();
      this.lastSyncTime = Date.now();
    }
  }

  // Get active contact
  public getActiveContact(): Contact | null {
    return this.activeContact;
  }

  // Add a new message
  public addMessage(message: InboxMessage): void {
    if (!message || !message.id) {
      console.error('MessageSyncService: Invalid message', message);
      return;
    }

    console.log('MessageSyncService: Adding message', message.id);

    // Store in localStorage for persistence
    this.storeMessageInLocalStorage(message);

    // Determine which contact this message belongs to
    let contactPhoneNumber = this.getContactPhoneNumberFromMessage(message);

    if (contactPhoneNumber) {
      // Get current messages for this contact
      const currentMessages = this.activeMessages.get(contactPhoneNumber) || [];

      // Check if message already exists
      if (!currentMessages.some(m => m.id === message.id)) {
        // Add message to contact's messages
        const updatedMessages = [...currentMessages, message];

        // Sort by timestamp
        updatedMessages.sort((a, b) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

        // Update stored messages
        this.activeMessages.set(contactPhoneNumber, updatedMessages);

        // Emit message_added event
        this.emit('message_added', {
          message,
          contactPhoneNumber
        });

        // If this is for the active contact, also emit active_chat_updated
        if (this.activeContact && contactPhoneNumber === this.activeContact.phoneNumber) {
          this.emit('active_chat_updated', {
            contact: this.activeContact,
            messages: updatedMessages,
            newMessage: message
          });
        }
      }
    }
  }

  // Sync active chat with latest messages
  public syncActiveChat(): void {
    if (!this.activeContact) {
      return;
    }

    console.log(`MessageSyncService: Syncing active chat for ${this.activeContact.phoneNumber}`);

    // Get stored messages for this contact
    const storedMessages = this.getStoredMessagesForContact(this.activeContact.phoneNumber);

    // Get current messages from active contact
    const currentMessages = this.activeContact.messages || [];

    // Combine messages, removing duplicates
    const messageMap = new Map<string, InboxMessage>();

    // Add current messages to map
    currentMessages.forEach(message => {
      if (message && message.id) {
        messageMap.set(message.id, message);
      }
    });

    // Add stored messages to map (will overwrite if duplicate ID)
    storedMessages.forEach(message => {
      if (message && message.id) {
        messageMap.set(message.id, message);
      }
    });

    // Convert map back to array
    let combinedMessages = Array.from(messageMap.values());

    // Apply content-based deduplication to catch messages with same content but different IDs
    combinedMessages = this.deduplicateMessages(combinedMessages);

    // Sort by timestamp
    combinedMessages.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Check if we have new messages or if deduplication changed the message count
    const hasChanges = combinedMessages.length !== currentMessages.length ||
      JSON.stringify(combinedMessages.map(m => m.id).sort()) !==
      JSON.stringify(currentMessages.map(m => m.id).sort());

    if (hasChanges) {
      console.log(`MessageSyncService: Found changes in messages for active chat`);

      // Update stored messages
      this.activeMessages.set(this.activeContact.phoneNumber, combinedMessages);

      // Update localStorage with deduplicated messages
      try {
        const allStoredMessages = localStorage.getItem('whatsapp_messages') || '[]';
        const allMessages = JSON.parse(allStoredMessages);

        // Filter out messages for this contact
        const otherMessages = allMessages.filter((msg: InboxMessage) => {
          const msgPhoneNumber = this.getContactPhoneNumberFromMessage(msg);
          return msgPhoneNumber !== this.activeContact!.phoneNumber;
        });

        // Combine with deduplicated messages for this contact
        const updatedAllMessages = [...otherMessages, ...combinedMessages];

        // Save back to localStorage
        localStorage.setItem('whatsapp_messages', JSON.stringify(updatedAllMessages));
      } catch (error) {
        console.error('Error updating localStorage during sync:', error);
      }

      // Emit messages_synced event
      this.emit('messages_synced', {
        contact: this.activeContact,
        messages: combinedMessages
      });
    }
  }

  // Get contact phone number from message
  private getContactPhoneNumberFromMessage(message: InboxMessage): string | null {
    if (!message) {
      return null;
    }

    // For outgoing messages
    if (message.outgoing || message.sender === 'me') {
      // If we have an active contact, use that
      if (this.activeContact) {
        return this.activeContact.phoneNumber;
      }

      // Otherwise, try to get from recipient
      if (message.recipient && typeof message.recipient === 'string') {
        return message.recipient.replace('@s.whatsapp.net', '');
      }
    }
    // For incoming messages
    else if (message.sender && typeof message.sender === 'string') {
      return message.sender.replace('@s.whatsapp.net', '');
    }

    return null;
  }

  // Helper function to deduplicate messages
  private deduplicateMessages(messages: InboxMessage[]): InboxMessage[] {
    if (!messages || messages.length === 0) {
      return [];
    }

    // First deduplicate by ID
    const messageMap = new Map<string, InboxMessage>();
    messages.forEach(msg => {
      if (msg && msg.id) {
        messageMap.set(msg.id, msg);
      }
    });

    // Then check for content duplicates (same message content, timestamp within 1 second)
    const result = Array.from(messageMap.values());
    const finalResult: InboxMessage[] = [];

    // Track processed message contents to avoid duplicates
    const processedContents = new Map<string, Set<number>>();

    result.forEach(msg => {
      if (!msg.message) {
        finalResult.push(msg);
        return;
      }

      const msgTime = new Date(msg.timestamp).getTime();
      const contentKey = `${msg.message}_${msg.outgoing ? 'out' : 'in'}`;

      // Check if we've seen this content before
      if (processedContents.has(contentKey)) {
        const timeSet = processedContents.get(contentKey)!;

        // Check if there's a timestamp within 1 second (1000ms)
        let isDuplicate = false;
        timeSet.forEach(time => {
          if (Math.abs(time - msgTime) < 1000) {
            isDuplicate = true;
          }
        });

        if (isDuplicate) {
          // Skip this message as it's likely a duplicate
          return;
        }

        // Not a duplicate, add this timestamp
        timeSet.add(msgTime);
      } else {
        // First time seeing this content
        processedContents.set(contentKey, new Set([msgTime]));
      }

      // Add to final result
      finalResult.push(msg);
    });

    return finalResult;
  }

  // Store message in localStorage
  private storeMessageInLocalStorage(message: InboxMessage): void {
    try {
      const storedMessages = localStorage.getItem('whatsapp_messages') || '[]';
      const messages = JSON.parse(storedMessages);

      // Check if message already exists
      if (!messages.some((msg: InboxMessage) => msg.id === message.id)) {
        // Add message
        messages.push(message);

        // Deduplicate messages to prevent duplicates with different IDs
        const deduplicatedMessages = this.deduplicateMessages(messages);

        // Limit to 1000 messages
        if (deduplicatedMessages.length > 1000) {
          deduplicatedMessages.splice(0, deduplicatedMessages.length - 1000);
        }

        // Save back to localStorage
        localStorage.setItem('whatsapp_messages', JSON.stringify(deduplicatedMessages));
      }
    } catch (error) {
      console.error('Error storing message in localStorage:', error);
    }
  }

  // Get stored messages for contact
  private getStoredMessagesForContact(phoneNumber: string): InboxMessage[] {
    try {
      const storedMessages = localStorage.getItem('whatsapp_messages') || '[]';
      const messages = JSON.parse(storedMessages);

      // Filter messages for this contact
      return messages.filter((message: InboxMessage) => {
        if (!message) return false;

        // For outgoing messages
        if (message.outgoing || message.sender === 'me') {
          if (message.recipient && typeof message.recipient === 'string') {
            return message.recipient.includes(phoneNumber);
          }
        }
        // For incoming messages
        else if (message.sender && typeof message.sender === 'string') {
          return message.sender.includes(phoneNumber);
        }

        return false;
      });
    } catch (error) {
      console.error('Error getting stored messages from localStorage:', error);
      return [];
    }
  }

  // Register event listener
  public on(event: EventType, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  // Remove event listener
  public off(event: EventType, callback?: EventCallback): void {
    if (!callback) {
      // Remove all listeners for this event
      this.eventListeners.set(event, []);
    } else {
      // Remove specific listener
      const listeners = this.eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
        this.eventListeners.set(event, listeners);
      }
    }
  }

  // Emit event
  private emit(event: EventType, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }
}

// Export singleton instance
export const messageSyncService = MessageSyncService.getInstance();
