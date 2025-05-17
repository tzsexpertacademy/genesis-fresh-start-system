import React, { useState, useEffect, useRef, memo } from 'react';
import { sendTextMessage, getContactMessages } from '../../services/whatsappService';
import ComponentCard from '../common/ComponentCard';
import stateManager from '../../utils/stateManager';
import transitionUtils from '../../utils/transitionUtils';
import QRCode from './QRCode';
import websocketService from '../../services/websocketService';
import { messageSyncService } from '../../services/messageSyncService';
import {
  InboxMessage,
  Contact,
  MessageGroup,
  WhatsAppConnectionStatus,
  BackendConnectionStatus,
  InboxViewMode
} from '../../types/whatsapp';

// Format phone number for display
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove the WhatsApp suffix if present
  return phoneNumber.replace('@s.whatsapp.net', '');
};

// Format timestamp for display
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format date for display in chat
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if date is today
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  // Check if date is yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // Otherwise return full date
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to deduplicate messages
const deduplicateMessages = (messages: InboxMessage[]): InboxMessage[] => {
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
};

// Group messages by date for chat view
const groupMessagesByDate = (messages: InboxMessage[]): MessageGroup[] => {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Create a copy of messages to sort
  const messagesToSort = [...messages];

  // Sort messages by timestamp (from oldest to newest)
  const sortedMessages = messagesToSort.sort((a, b) => {
    try {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();

      if (isNaN(timeA) || isNaN(timeB)) {
        return a.timestamp.localeCompare(b.timestamp);
      }

      return timeA - timeB;
    } catch (error) {
      console.error('Error sorting messages by timestamp:', error);
      return a.timestamp.localeCompare(b.timestamp);
    }
  });

  // Group by date
  const groups: Record<string, InboxMessage[]> = {};

  sortedMessages.forEach(message => {
    try {
      const date = new Date(message.timestamp).toDateString();

      if (!groups[date]) {
        groups[date] = [];
      }

      groups[date].push(message);
    } catch (error) {
      console.error('Error grouping message by date:', error, message);
      if (!groups['Unknown Date']) {
        groups['Unknown Date'] = [];
      }
      groups['Unknown Date'].push(message);
    }
  });

  // Convert to array of groups and sort by date (oldest first)
  const groupArray = Object.keys(groups)
    .map(date => ({
      date,
      messages: groups[date]
    }))
    .sort((a, b) => {
      if (a.date === 'Unknown Date') return -1;
      if (b.date === 'Unknown Date') return 1;

      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (error) {
        return a.date.localeCompare(b.date);
      }
    });

  return groupArray;
};

const EnhancedInboxTable: React.FC = () => {
  // State for messages and contacts
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  // UI state
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [viewMode, setViewMode] = useState<InboxViewMode>('contacts');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Connection status
  const [backendStatus, setBackendStatus] = useState<BackendConnectionStatus>('unknown');
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppConnectionStatus>('unknown');
  const [showQRCode, setShowQRCode] = useState<boolean>(false);

  // Quick reply options
  const [quickReplyOptions] = useState<string[]>([
    "Hello, how can I help you?",
    "Thank you for your message.",
    "I will get back to you shortly.",
    "Could you provide more details?"
  ]);

  // Reference for local messages

  // References
  const replyInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const localMessagesRef = useRef<InboxMessage[]>([]);

  // Function to group messages by contact
  const groupMessagesByContact = (messages: InboxMessage[]): Contact[] => {
    if (!messages || messages.length === 0) {
      return [];
    }

    const contactsMap = new Map<string, Contact>();

    // Create a copy of messages to sort
    const messagesToSort = [...messages];

    // Sort messages by timestamp (newest first)
    const sortedMessages = messagesToSort.sort((a, b) => {
      try {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();

        if (isNaN(timeA) || isNaN(timeB)) {
          return b.timestamp.localeCompare(a.timestamp);
        }

        return timeB - timeA;
      } catch (error) {
        console.error('Error sorting messages by timestamp:', error);
        return b.timestamp.localeCompare(a.timestamp);
      }
    });

    // Group messages by sender
    sortedMessages.forEach(message => {
      try {
        // Skip invalid messages
        if (!message || typeof message !== 'object') {
          console.warn('Skipping invalid message:', message);
          return;
        }

        // Set default values
        let phoneNumber = 'unknown-contact';
        let outgoing = false;

        // Safely check sender property
        if (message.sender) {
          // First set default phoneNumber to the sender
          phoneNumber = message.sender;

          // Check if it's a WhatsApp contact
          if (typeof message.sender === 'string' && message.sender.includes('@s.whatsapp.net')) {
            // Incoming message from WhatsApp contact
            phoneNumber = message.sender.replace('@s.whatsapp.net', '');
            outgoing = false;
          } else if (message.sender === 'me') {
            // Outgoing message (temporary for optimistic updates)
            outgoing = true;

            if (activeContact) {
              phoneNumber = activeContact.phoneNumber;
            } else {
              // Try to find a related incoming message
              const lastIncomingMessage = messagesToSort.find(m =>
                m && m.sender && typeof m.sender === 'string' && m.sender.includes('@s.whatsapp.net')
              );

              if (lastIncomingMessage && lastIncomingMessage.sender) {
                phoneNumber = lastIncomingMessage.sender.replace('@s.whatsapp.net', '');
              } else {
                phoneNumber = 'unknown-contact';
              }
            }
          } else {
            // Other messages, likely outgoing
            outgoing = true;
            if (activeContact) {
              phoneNumber = activeContact.phoneNumber;
            }
          }
        } else if (message.recipient) {
          // If no sender but has recipient, it's likely an outgoing message
          phoneNumber = typeof message.recipient === 'string' ? message.recipient : 'unknown-contact';
          outgoing = true;
        }

        // Set the outgoing property on the message
        message.outgoing = outgoing;

        // Use fallback for empty phone numbers
        if (!phoneNumber || phoneNumber.trim() === '') {
          phoneNumber = 'unknown-' + Math.random().toString(36).substring(7);
        }

        if (!contactsMap.has(phoneNumber)) {
          // Create new contact
          contactsMap.set(phoneNumber, {
            phoneNumber,
            displayName: phoneNumber, // Use phone number as display name
            lastMessage: message,
            unreadCount: message.read ? 0 : 1,
            messages: [message]
          });
        } else {
          // Update existing contact
          const contact = contactsMap.get(phoneNumber)!;
          contact.messages.push(message);

          if (!message.read) {
            contact.unreadCount += 1;
          }

          // Update last message if this one is newer
          try {
            const currentLastTime = new Date(contact.lastMessage.timestamp).getTime();
            const newMessageTime = new Date(message.timestamp).getTime();

            if (newMessageTime > currentLastTime) {
              contact.lastMessage = message;
            }
          } catch (error) {
            console.error('Error comparing message timestamps:', error);
            contact.lastMessage = message;
          }
        }
      } catch (error) {
        console.error('Error processing message for contact grouping:', error, message);
      }
    });

    // Convert map to array and sort by last message timestamp (newest first)
    return Array.from(contactsMap.values())
      .sort((a, b) => {
        try {
          const timeA = new Date(a.lastMessage.timestamp).getTime();
          const timeB = new Date(b.lastMessage.timestamp).getTime();

          if (isNaN(timeA) || isNaN(timeB)) {
            return b.lastMessage.timestamp.localeCompare(a.lastMessage.timestamp);
          }

          return timeB - timeA;
        } catch (error) {
          console.error('Error sorting contacts by timestamp:', error);
          return b.lastMessage.timestamp.localeCompare(a.lastMessage.timestamp);
        }
      });
  };

  // Handle sending a reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeContact || !replyMessage.trim()) {
      return;
    }

    try {
      // Set sending state to true to show sending indicator
      setIsSending(true);

      // Save message to send
      const messageToSend = replyMessage;

      // Clear input field immediately for better UX
      setReplyMessage('');

      // Generate a unique ID for the temporary message
      const tempId = `temp-${Date.now()}`;

      // Add temporary message to chat (optimistic update)
      const tempMessage: InboxMessage = {
        id: tempId,
        sender: 'me',
        message: messageToSend,
        timestamp: new Date().toISOString(),
        read: true
      };

      // Add to local messages reference to prevent loss during refresh
      localMessagesRef.current = [...localMessagesRef.current, tempMessage];

      // Save to localStorage to persist across page navigations
      try {
        // Get existing messages from localStorage
        const storedMessages = localStorage.getItem('whatsapp_messages');
        let messages = storedMessages ? JSON.parse(storedMessages) : [];

        // Add new message
        messages.push(tempMessage);

        // Keep only the last 1000 messages to prevent localStorage from getting too large
        if (messages.length > 1000) {
          messages = messages.slice(messages.length - 1000);
        }

        // Save back to localStorage
        localStorage.setItem('whatsapp_messages', JSON.stringify(messages));
        console.log('Saved outgoing message to localStorage');
      } catch (error) {
        console.error('Error saving outgoing message to localStorage:', error);
      }

      // Update active contact with temporary message immediately
      if (activeContact) {
        // Create a deep copy of the active contact to avoid reference issues
        const updatedMessages = [...activeContact.messages, tempMessage];
        const updatedContact = {
          ...activeContact,
          messages: updatedMessages,
          lastMessage: tempMessage
        };

        // Update the active contact state
        setActiveContact(updatedContact);

        // Update global messages and contacts
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, tempMessage];
          // Recalculate contacts with the new message
          const updatedContacts = groupMessagesByContact(newMessages);
          setContacts(updatedContacts);
          return newMessages;
        });

        // Scroll to bottom of chat immediately
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 10);
      }

      // Send the message to the server
      const response = await sendTextMessage(activeContact.phoneNumber, messageToSend);

      if (response && response.status) {
        console.log('Message sent successfully:', response);

        // Update the temporary message with the real ID
        if (response.data && response.data.messageId) {
          const realMessageId = response.data.messageId;

          // Update local messages reference with the real ID
          for (let i = 0; i < localMessagesRef.current.length; i++) {
            if (localMessagesRef.current[i].id === tempId) {
              localMessagesRef.current[i] = {
                ...localMessagesRef.current[i],
                id: realMessageId,
                outgoing: true
              };
              break;
            }
          }

          // Update localStorage to replace the temporary message with the real one
          try {
            const storedMessages = localStorage.getItem('whatsapp_messages') || '[]';
            let messages = JSON.parse(storedMessages);

            // Find and replace the temporary message
            const updatedMessages = messages.map((msg: InboxMessage) =>
              msg.id === tempId
                ? { ...msg, id: realMessageId, outgoing: true }
                : msg
            );

            // Remove any potential duplicates (messages with the same content but different IDs)
            const deduplicatedMessages = deduplicateMessages(updatedMessages);

            // Save back to localStorage
            localStorage.setItem('whatsapp_messages', JSON.stringify(deduplicatedMessages));
            console.log('Updated sent message ID in localStorage');
          } catch (error) {
            console.error('Error updating message ID in localStorage:', error);
          }

          // Update the active contact's messages with the real ID
          if (activeContact) {
            setActiveContact(prevContact => {
              if (!prevContact) return null;

              // Map messages to replace temp ID with real ID
              const updatedMessages = prevContact.messages.map(msg =>
                msg.id === tempId
                  ? { ...msg, id: realMessageId, outgoing: true }
                  : msg
              );

              // Update last message if needed
              const updatedLastMessage =
                prevContact.lastMessage.id === tempId
                  ? { ...prevContact.lastMessage, id: realMessageId, outgoing: true }
                  : prevContact.lastMessage;

              return {
                ...prevContact,
                messages: updatedMessages,
                lastMessage: updatedLastMessage
              };
            });

            // Also update global messages state
            setMessages(prevMessages => {
              return prevMessages.map(msg =>
                msg.id === tempId
                  ? { ...msg, id: realMessageId, outgoing: true }
                  : msg
              );
            });
          }

          // Request a refresh of the inbox data via WebSocket after a delay
          // to ensure the backend has time to process the message
          setTimeout(() => {
            websocketService.requestInbox();
          }, 2000);
        }
      } else {
        console.error('Failed to send message:', response);

        if (response.message && response.message.includes('WhatsApp is not connected')) {
          setWhatsappStatus('disconnected');
          setShowQRCode(true);
        } else {
          // Remove the temporary message since sending failed
          if (activeContact) {
            setActiveContact(prevContact => {
              if (!prevContact) return null;

              // Filter out the temporary message
              const filteredMessages = prevContact.messages.filter(msg => msg.id !== tempId);
              return {
                ...prevContact,
                messages: filteredMessages,
                // Set the last message to the previous one
                lastMessage: filteredMessages.length > 0
                  ? filteredMessages[filteredMessages.length - 1]
                  : prevContact.lastMessage
              };
            });

            // Update global messages and contacts
            setMessages(prevMessages => {
              const filteredMessages = prevMessages.filter(msg => msg.id !== tempId);
              const updatedContacts = groupMessagesByContact(filteredMessages);
              setContacts(updatedContacts);
              return filteredMessages;
            });

            // Also update local messages reference
            localMessagesRef.current = localMessagesRef.current.filter(msg => msg.id !== tempId);
          }

          alert('Failed to send message. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);

      if (error.message && error.message.includes('WhatsApp is not connected')) {
        setWhatsappStatus('disconnected');
        setShowQRCode(true);
      } else {
        alert('Error sending message. Please try again.');
      }
    } finally {
      // Always reset the sending state
      setIsSending(false);
    }
  };

  // Handle selecting a contact
  const handleContactSelect = (contact: Contact) => {
    console.log(`Selecting contact: ${contact.phoneNumber}`);

    // Set the active contact in the message sync service
    // This is crucial for maintaining state across navigation
    messageSyncService.setActiveContact(contact);

    // Set the active contact in the component state
    setActiveContact(contact);
    setViewMode('chat');

    // Focus on reply input after a short delay
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus();
      }

      // Scroll to bottom of chat
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Handle going back to contacts list
  const handleBackToContacts = () => {
    setViewMode('contacts');
    setActiveContact(null);
  };

  // Handle quick reply selection
  const handleQuickReplySelect = (message: string) => {
    setReplyMessage(message);

    // Focus on reply input
    if (replyInputRef.current) {
      replyInputRef.current.focus();
    }
  };

  // Handle reconnect button click
  const handleReconnect = () => {
    setShowQRCode(true);
  };

  // Completely rewritten inbox data processing to prevent duplicates
  const processInboxData = (inboxData: InboxMessage[]) => {
    if (!inboxData || !Array.isArray(inboxData)) {
      console.error('Invalid inbox data received:', inboxData);
      return;
    }

    console.log('Processing inbox data, received', inboxData.length, 'messages');

    // Create a map of all messages by ID for efficient deduplication
    const messageMap = new Map<string, InboxMessage>();

    // First add all existing messages from our local reference
    localMessagesRef.current.forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Then add new messages from inbox data (will overwrite if duplicate ID)
    let newMessageCount = 0;
    inboxData.forEach(msg => {
      if (!messageMap.has(msg.id)) {
        newMessageCount++;
      }
      messageMap.set(msg.id, msg);
    });

    if (newMessageCount > 0) {
      console.log(`Found ${newMessageCount} new messages in inbox data`);
    }

    // Convert map back to array
    let allMessages = Array.from(messageMap.values());

    // Apply content-based deduplication to catch messages with same content but different IDs
    allMessages = deduplicateMessages(allMessages);

    // Update local reference
    localMessagesRef.current = allMessages;

    // Update localStorage with deduplicated messages
    try {
      localStorage.setItem('whatsapp_messages', JSON.stringify(allMessages));
      console.log('Updated localStorage with deduplicated messages');
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }

    // Update messages state
    setMessages(allMessages);

    // Update last refresh time
    setLastRefreshTime(new Date().toLocaleTimeString());

    // Group messages by contact
    const groupedContacts = groupMessagesByContact(allMessages);
    setContacts(groupedContacts);

    // If we have an active contact, update it with new messages
    if (activeContact) {
      const updatedActiveContact = groupedContacts.find(
        contact => contact.phoneNumber === activeContact.phoneNumber
      );

      if (updatedActiveContact) {
        // Check if there are new messages for this contact
        const currentMessageIds = new Set(activeContact.messages.map(msg => msg.id));
        const hasNewMessages = updatedActiveContact.messages.some(msg => !currentMessageIds.has(msg.id));

        if (hasNewMessages) {
          console.log(`Updating active contact with new messages`);

          // Update the active contact
          setActiveContact(updatedActiveContact);

          // Scroll to bottom of chat
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 10);
        }
      }
    }

    // Clear loading state
    setLoading(false);
  };

  // Effect for active chat load with polling for real-time updates
  useEffect(() => {
    // Only run when active contact changes
    if (!activeContact || !isMounted.current) return;

    console.log(`Loading messages for active contact ${activeContact.phoneNumber}`);

    // Function to load messages for the active contact
    const loadContactMessages = async () => {
      if (!isMounted.current || !activeContact) return;

      try {
        // Use our endpoint to get messages specifically for this contact
        const response = await getContactMessages(activeContact.phoneNumber);

        // Check if we got a valid response
        if (response && response.status && response.data?.messages) {
          console.log(`Received ${response.data.messages.length} messages for contact ${activeContact.phoneNumber}`);

          // Add messages to the message sync service for persistence
          response.data.messages.forEach((message: InboxMessage) => {
            if (message && message.id) {
              messageSyncService.addMessage(message);
            }
          });

          // Create a set of existing message IDs for faster lookup
          const existingMessageIds = new Set(activeContact.messages.map((msg: InboxMessage) => msg.id));

          // Filter out messages we already have
          const newMessages = response.data.messages.filter((msg: InboxMessage) => !existingMessageIds.has(msg.id));

          if (newMessages.length > 0) {
            console.log(`Found ${newMessages.length} additional messages for active contact`);

            // Update the active contact with the new messages
            setActiveContact(prevContact => {
              if (!prevContact) return null;

              // Create a map of message IDs to prevent duplicates
              const messageMap = new Map<string, InboxMessage>();

              // Add existing messages to the map
              prevContact.messages.forEach((msg: InboxMessage) => {
                messageMap.set(msg.id, msg);
              });

              // Add new messages to the map (will overwrite if duplicate ID)
              newMessages.forEach((msg: InboxMessage) => {
                messageMap.set(msg.id, msg);
              });

              // Convert map back to array and sort by timestamp
              const updatedMessages = Array.from(messageMap.values()).sort((a: InboxMessage, b: InboxMessage) => {
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
              });

              // Get the last message
              const lastMessage = updatedMessages[updatedMessages.length - 1];

              // Update the contact
              return {
                ...prevContact,
                messages: updatedMessages,
                lastMessage,
                unreadCount: prevContact.unreadCount + newMessages.filter((msg: InboxMessage) => !msg.outgoing).length
              };
            });

            // Scroll to bottom of chat
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 10);
          }
        } else if (response && response.message && response.message.includes('fallback')) {
          // This is a fallback response when the backend is not available
          console.log('Received fallback contact messages response:', response);

          // Even with fallback data, we should update the UI
          if (response.data?.messages && response.data.messages.length > 0) {
            // Add fallback messages to the message sync service
            response.data.messages.forEach((message: InboxMessage) => {
              if (message && message.id) {
                messageSyncService.addMessage(message);
              }
            });

            // Update the active contact with the fallback messages
            setActiveContact(prevContact => {
              if (!prevContact) return null;

              // Create a map of message IDs to prevent duplicates
              const messageMap = new Map<string, InboxMessage>();

              // Add existing messages to the map
              prevContact.messages.forEach((msg: InboxMessage) => {
                messageMap.set(msg.id, msg);
              });

              // Add fallback messages to the map
              response.data.messages.forEach((msg: InboxMessage) => {
                messageMap.set(msg.id, msg);
              });

              // Convert map back to array and sort by timestamp
              const updatedMessages = Array.from(messageMap.values()).sort((a: InboxMessage, b: InboxMessage) => {
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
              });

              // Get the last message
              const lastMessage = updatedMessages[updatedMessages.length - 1];

              return {
                ...prevContact,
                messages: updatedMessages,
                lastMessage
              };
            });

            // Scroll to bottom of chat
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 10);
          }
        }
      } catch (error) {
        console.error('Error loading contact messages:', error);

        // Trigger a sync in the message sync service
        messageSyncService.syncActiveChat();

        // Try to reconnect WebSocket if there's an error
        websocketService.connect();
      }
    };

    // Load messages immediately when active contact changes
    loadContactMessages();

    // Set up polling interval with exponential backoff
    let pollingDelay = 2000; // Start with 2 seconds
    let consecutiveErrors = 0;
    let pollingIntervalId: number | null = null;

    // Function to create polling interval
    const createPollingInterval = (delay: number) => {
      // Clear any existing interval
      if (pollingIntervalId !== null) {
        clearInterval(pollingIntervalId);
      }

      // Create new interval
      return window.setInterval(() => {
        if (isMounted.current && activeContact) {
          console.log(`Polling for new messages for active contact (delay: ${delay}ms)`);

          // Load messages
          loadContactMessages()
            .then(() => {
              // Reset consecutive errors if successful
              if (consecutiveErrors > 0) {
                consecutiveErrors = 0;

                // If we had errors before but now it's working, reset to normal polling rate
                if (pollingDelay > 2000) {
                  pollingDelay = 2000;
                  pollingIntervalId = createPollingInterval(pollingDelay);
                }
              }
            })
            .catch(error => {
              console.error('Error in polling interval:', error);
              consecutiveErrors++;

              // Increase polling delay after consecutive errors (up to 10 seconds)
              if (consecutiveErrors > 2) {
                pollingDelay = Math.min(pollingDelay * 1.5, 10000);
                pollingIntervalId = createPollingInterval(pollingDelay);
              }
            });
        }
      }, delay);
    };

    // Create initial polling interval
    pollingIntervalId = createPollingInterval(pollingDelay);

    // Clean up interval when component unmounts or active contact changes
    return () => {
      if (pollingIntervalId !== null) {
        clearInterval(pollingIntervalId);
      }
    };

  }, [activeContact?.phoneNumber]); // Only re-run when active contact changes

  // Initialize WebSocket connection and event listeners
  useEffect(() => {
    // Set component as mounted
    isMounted.current = true;

    // Register component as active
    stateManager.registerComponent('inbox');

    // Load messages from localStorage
    try {
      const storedMessages = localStorage.getItem('whatsapp_messages');
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        console.log(`Loaded ${parsedMessages.length} messages from localStorage`);

        // Add to local messages reference
        localMessagesRef.current = parsedMessages;
      }
    } catch (error) {
      console.error('Error loading messages from localStorage:', error);
    }

    // Check for pending messages in sessionStorage
    try {
      // Get pending messages from WebSocket service
      const pendingMessages = websocketService.checkPendingMessages();

      if (pendingMessages.length > 0) {
        console.log(`Found ${pendingMessages.length} pending messages in sessionStorage`);

        // Add to local messages reference if not already there
        pendingMessages.forEach(message => {
          if (!localMessagesRef.current.some(msg => msg.id === message.id)) {
            localMessagesRef.current.push(message);

            // Also add to message sync service
            messageSyncService.addMessage(message);
          }
        });

        // Process these messages immediately if we have an active contact
        if (activeContact) {
          console.log('Processing pending messages for active contact');

          // Set the active contact in the message sync service
          messageSyncService.setActiveContact(activeContact);

          pendingMessages.forEach(message => {
            // Check if this message is for the active contact
            let isForActiveContact = false;

            // First check if sender exists and is a string
            if (message.sender && typeof message.sender === 'string') {
              const messageNumber = message.sender.includes('@s.whatsapp.net')
                ? message.sender.replace('@s.whatsapp.net', '')
                : message.sender;

              isForActiveContact =
                messageNumber === activeContact.phoneNumber ||
                message.sender === 'me';
            }

            // Also check recipient field
            if (!isForActiveContact && message.recipient && typeof message.recipient === 'string') {
              isForActiveContact = message.recipient.includes(activeContact.phoneNumber);
            }

            if (isForActiveContact) {
              console.log('Found pending message for active contact:', message);

              // Emit an active_chat_update event for this message
              websocketService.updateActiveChat(message, activeContact.phoneNumber);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing pending messages:', error);
    }

    // Connect to WebSocket
    websocketService.connect();

    // Set up message sync service event listeners
    messageSyncService.on('active_chat_updated', (data) => {
      if (!isMounted.current) return;

      console.log('MessageSyncService: Received active_chat_updated event', data);

      if (data.contact && data.messages) {
        // Update the active contact with the synced messages
        setActiveContact(prevContact => {
          if (!prevContact) return data.contact;
          if (prevContact.phoneNumber !== data.contact.phoneNumber) return prevContact;

          return {
            ...prevContact,
            messages: data.messages,
            lastMessage: data.messages[data.messages.length - 1]
          };
        });

        // Scroll to bottom of chat
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 10);
      }
    });

    messageSyncService.on('message_added', (data) => {
      if (!isMounted.current) return;

      console.log('MessageSyncService: Received message_added event', data);

      // Add to local messages reference if not already there
      if (data.message && !localMessagesRef.current.some(msg => msg.id === data.message.id)) {
        localMessagesRef.current.push(data.message);

        // Update global messages state
        setMessages(prevMessages => {
          // Skip if already exists
          if (prevMessages.some(msg => msg.id === data.message.id)) {
            return prevMessages;
          }

          const updatedMessages = [...prevMessages, data.message];

          // Update contacts list
          const updatedContacts = groupMessagesByContact(updatedMessages);
          setContacts(updatedContacts);

          return updatedMessages;
        });
      }
    });

    // Set up event listeners
    websocketService.on('connection_status', (status) => {
      if (isMounted.current) {
        setWhatsappStatus(status);

        if (status === 'disconnected') {
          setShowQRCode(true);
        } else if (status === 'connected') {
          setShowQRCode(false);

          // Request inbox data when connected
          websocketService.requestInbox();
        }
      }
    });

    websocketService.on('inbox_data', (data) => {
      if (isMounted.current) {
        processInboxData(data);
      }
    });

    // Handler for direct messages - highest priority real-time updates
    websocketService.on('direct_message', (data) => {
      if (!isMounted.current) return;

      console.log('Received direct message with high priority:', data);

      // Extract the message
      const message = data.message;

      if (!message || !message.id || typeof message !== 'object') {
        console.error('Invalid direct message format:', data);
        return;
      }

      // Create a standardized message object with safe defaults
      const newMessage: InboxMessage = {
        id: message.id,
        sender: message.sender || 'unknown',
        message: message.message || '',
        timestamp: message.timestamp || data.timestamp || new Date().toISOString(),
        read: false,
        outgoing: (message.sender === 'me' || message.outgoing) ? true : false
      };

      // Store in sessionStorage for immediate access
      try {
        const messageKey = `direct_message_${message.id}`;
        sessionStorage.setItem(messageKey, JSON.stringify({
          message: newMessage,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('Error storing direct message in sessionStorage:', err);
      }

      // Add to local reference if not already there
      if (!localMessagesRef.current.some(msg => msg.id === newMessage.id)) {
        localMessagesRef.current.push(newMessage);

        // Also update global messages state
        setMessages(prevMessages => {
          // Skip if already exists
          if (prevMessages.some(msg => msg.id === newMessage.id)) {
            return prevMessages;
          }

          const updatedMessages = [...prevMessages, newMessage];

          // Update contacts list
          const updatedContacts = groupMessagesByContact(updatedMessages);
          setContacts(updatedContacts);

          return updatedMessages;
        });

        // Save to localStorage for persistence
        try {
          const storedMessages = localStorage.getItem('whatsapp_messages') || '[]';
          const messages: InboxMessage[] = JSON.parse(storedMessages);

          if (!messages.some((msg: InboxMessage) => msg.id === newMessage.id)) {
            messages.push(newMessage);
            if (messages.length > 1000) {
              messages.splice(0, messages.length - 1000);
            }
            localStorage.setItem('whatsapp_messages', JSON.stringify(messages));
          }
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      }

      // If we have an active contact, check if this message is for them
      if (activeContact) {
        // Check if this message is for the active contact
        let isForActiveContact = false;

        // First check if sender exists and is a string
        if (message.sender && typeof message.sender === 'string') {
          const messageNumber = message.sender.includes('@s.whatsapp.net')
            ? message.sender.replace('@s.whatsapp.net', '')
            : message.sender;

          isForActiveContact =
            messageNumber === activeContact.phoneNumber ||
            message.sender === 'me';
        }

        // Also check recipient field
        if (!isForActiveContact && message.recipient && typeof message.recipient === 'string') {
          isForActiveContact = message.recipient.includes(activeContact.phoneNumber);
        }

        if (isForActiveContact) {
          console.log('Direct message is for active contact, updating immediately');

          // Check if message is already in active contact messages
          if (!activeContact.messages.some(msg => msg.id === newMessage.id)) {
            // Update active contact with new message - IMMEDIATELY
            setActiveContact(prevContact => {
              if (!prevContact) return null;

              // Add the new message to the contact's messages
              const updatedMessages = [...prevContact.messages, newMessage];

              // Sort by timestamp
              updatedMessages.sort((a, b) => {
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
              });

              // Get the last message
              const lastMessage = updatedMessages[updatedMessages.length - 1];

              return {
                ...prevContact,
                messages: updatedMessages,
                lastMessage,
                unreadCount: prevContact.unreadCount + (newMessage.outgoing ? 0 : 1)
              };
            });

            // Scroll to bottom of chat
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 10);
          }
        }
      }

      // Set new message flag and play notification sound
      setHasNewMessages(true);
      setTimeout(() => {
        if (isMounted.current) setHasNewMessages(false);
      }, 5000);

      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Could not play notification sound:', e));
      } catch (error) {
        console.log('Audio notification not supported');
      }
    });

    // Handler for general new messages
    websocketService.on('new_message', (message) => {
      if (!isMounted.current) return;

      console.log('Received new message via WebSocket:', message);

      // Set new message flag and play notification sound
      setHasNewMessages(true);
      setTimeout(() => {
        if (isMounted.current) setHasNewMessages(false);
      }, 5000);

      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Could not play notification sound:', e));
      } catch (error) {
        console.log('Audio notification not supported');
      }

      // Create a standardized message object
      const newMessage: InboxMessage = {
        id: message.id || `temp-${Date.now()}`,
        sender: message.sender,
        message: message.message,
        timestamp: message.timestamp || new Date().toISOString(),
        read: false,
        outgoing: message.sender === 'me' || message.outgoing
      };

      // Check if we already have this message to prevent duplicates
      const isDuplicate = localMessagesRef.current.some(msg => msg.id === newMessage.id);
      if (isDuplicate) {
        console.log(`Message ${newMessage.id} already exists, skipping`);
        return;
      }

      // Add to local reference
      localMessagesRef.current.push(newMessage);

      // Update global messages state
      setMessages(prevMessages => {
        // Skip if already exists
        if (prevMessages.some(msg => msg.id === newMessage.id)) {
          return prevMessages;
        }

        const updatedMessages = [...prevMessages, newMessage];

        // Update contacts list
        const updatedContacts = groupMessagesByContact(updatedMessages);
        setContacts(updatedContacts);

        return updatedMessages;
      });

      // Save to localStorage for persistence
      try {
        const storedMessages = localStorage.getItem('whatsapp_messages') || '[]';
        const messages: InboxMessage[] = JSON.parse(storedMessages);

        if (!messages.some((msg: InboxMessage) => msg.id === newMessage.id)) {
          messages.push(newMessage);
          if (messages.length > 1000) {
            messages.splice(0, messages.length - 1000);
          }
          localStorage.setItem('whatsapp_messages', JSON.stringify(messages));
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    });

    // Dedicated handler for active chat updates - this is the key to fixing the issue
    websocketService.on('active_chat_update', (data) => {
      if (!isMounted.current) return;

      console.log('Received active chat update:', data);

      // Extract the message from the data
      const message = data.message || data;
      const specificPhoneNumber = data.phoneNumber || null;

      // Skip invalid messages
      if (!message || typeof message !== 'object') {
        console.warn('Received invalid message in active_chat_update:', message);
        return;
      }

      // Create a standardized message object with safe defaults
      const newMessage: InboxMessage = {
        id: message.id || `temp-${Date.now()}`,
        sender: message.sender || 'unknown',
        message: message.message || '',
        timestamp: message.timestamp || new Date().toISOString(),
        read: false,
        outgoing: (message.sender === 'me' || message.outgoing) ? true : false
      };

      // Add to local reference if not already there - do this regardless of active contact
      if (!localMessagesRef.current.some((msg: InboxMessage) => msg.id === newMessage.id)) {
        console.log('Adding new message to local reference:', newMessage);
        localMessagesRef.current.push(newMessage);

        // Also update global messages state to ensure contacts list is updated
        setMessages(prevMessages => {
          // Skip if already exists
          if (prevMessages.some((msg: InboxMessage) => msg.id === newMessage.id)) {
            return prevMessages;
          }

          const updatedMessages = [...prevMessages, newMessage];

          // Update contacts list
          const updatedContacts = groupMessagesByContact(updatedMessages);
          setContacts(updatedContacts);

          return updatedMessages;
        });
      }

      // Check if this is a force refresh request
      if (data.forceRefresh) {
        console.log('Received force refresh request in active_chat_update');

        if (activeContact && specificPhoneNumber === activeContact.phoneNumber) {
          // Trigger a force refresh of the active chat
          websocketService.forceRefreshActiveChat(activeContact.phoneNumber);
        }

        return;
      }

      // If we don't have an active contact, we can't update it
      if (!activeContact) {
        console.log('No active contact, skipping active chat update');
        return;
      }

      // Check if this message is for the active contact
      let isForActiveContact = false;

      // If a specific phone number was provided, use that
      if (specificPhoneNumber) {
        isForActiveContact = specificPhoneNumber === activeContact.phoneNumber;
      } else {
        // Otherwise, determine from the message
        // First check if sender exists and is a string
        if (message.sender && typeof message.sender === 'string') {
          const messageNumber = message.sender.includes('@s.whatsapp.net')
            ? message.sender.replace('@s.whatsapp.net', '')
            : message.sender;

          isForActiveContact =
            messageNumber === activeContact.phoneNumber ||
            message.sender === 'me';
        }

        // Also check recipient field
        if (!isForActiveContact && message.recipient && typeof message.recipient === 'string') {
          isForActiveContact = message.recipient.includes(activeContact.phoneNumber);
        }
      }

      // If this message is for the active contact, also trigger a force refresh
      // to ensure we have the latest messages
      if (isForActiveContact) {
        // Schedule a force refresh after a short delay
        setTimeout(() => {
          if (isMounted.current && activeContact) {
            websocketService.forceRefreshActiveChat(activeContact.phoneNumber);
          }
        }, 500);
      }

      if (isForActiveContact) {
        console.log('Active chat update is for current active contact, updating immediately');

        // Check if message is already in active contact messages
        if (!activeContact.messages.some((msg: InboxMessage) => msg.id === newMessage.id)) {
          console.log('Adding new message to active chat:', newMessage);

          // Update active contact with new message - IMMEDIATELY
          setActiveContact(prevContact => {
            if (!prevContact) return null;

            // Add the new message to the contact's messages
            const updatedMessages = [...prevContact.messages, newMessage];

            // Sort by timestamp
            updatedMessages.sort((a, b) => {
              return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });

            // Get the last message
            const lastMessage = updatedMessages[updatedMessages.length - 1];

            return {
              ...prevContact,
              messages: updatedMessages,
              lastMessage,
              unreadCount: prevContact.unreadCount + (newMessage.outgoing ? 0 : 1)
            };
          });

          // Scroll to bottom of chat
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 10);

          // Save to localStorage for persistence
          try {
            const storedMessages = localStorage.getItem('whatsapp_messages') || '[]';
            const messages: InboxMessage[] = JSON.parse(storedMessages);

            if (!messages.some((msg: InboxMessage) => msg.id === newMessage.id)) {
              messages.push(newMessage);
              if (messages.length > 1000) {
                messages.splice(0, messages.length - 1000);
              }
              localStorage.setItem('whatsapp_messages', JSON.stringify(messages));
              console.log('Saved new message to localStorage');
            }
          } catch (error) {
            console.error('Error saving to localStorage:', error);
          }
        } else {
          console.log('Message already exists in active chat, skipping update');
        }
      } else {
        console.log('Message is not for active contact, skipping active chat update');
      }
    });

    websocketService.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (isMounted.current) {
        setBackendStatus('offline');
        setError('Connection to server lost. Please check your internet connection.');
      }
    });

    // Initial request for inbox data
    websocketService.requestInbox();

    // Set up periodic requests for inbox data
    const refreshInterval = setInterval(() => {
      if (isMounted.current) {
        websocketService.requestInbox();
      }
    }, 10000); // Every 10 seconds

    // Add handler for force refresh chat events
    websocketService.on('force_refresh_chat', (data) => {
      if (!isMounted.current) return;

      console.log('Received force refresh chat event:', data);

      // Only process if we have an active contact
      if (!activeContact) {
        console.log('No active contact, skipping force refresh');
        return;
      }

      // Check if this refresh is for the active contact
      if (data.phoneNumber === activeContact.phoneNumber) {
        console.log(`Force refreshing active chat for ${activeContact.phoneNumber}`);

        // Directly call the contact messages API to get the latest messages
        const loadContactMessages = async () => {
          try {
            const response = await getContactMessages(activeContact.phoneNumber);

            if (response.status && response.data?.messages) {
              console.log(`Force refresh: Received ${response.data.messages.length} messages for contact ${activeContact.phoneNumber}`);

              // Create a set of existing message IDs for faster lookup
              const existingMessageIds = new Set(activeContact.messages.map((msg: InboxMessage) => msg.id));

              // Filter out messages we already have
              const newMessages = response.data.messages.filter((msg: InboxMessage) => !existingMessageIds.has(msg.id));

              if (newMessages.length > 0) {
                console.log(`Force refresh: Found ${newMessages.length} new messages for active contact`);

                // Update the active contact with the new messages
                setActiveContact(prevContact => {
                  if (!prevContact) return null;

                  // Create a map of message IDs to prevent duplicates
                  const messageMap = new Map<string, InboxMessage>();

                  // Add existing messages to the map
                  prevContact.messages.forEach((msg: InboxMessage) => {
                    messageMap.set(msg.id, msg);
                  });

                  // Add new messages to the map (will overwrite if duplicate ID)
                  newMessages.forEach((msg: InboxMessage) => {
                    messageMap.set(msg.id, msg);
                  });

                  // Convert map back to array and sort by timestamp
                  const updatedMessages = Array.from(messageMap.values()).sort((a: InboxMessage, b: InboxMessage) => {
                    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                  });

                  // Get the last message
                  const lastMessage = updatedMessages[updatedMessages.length - 1];

                  // Update the contact
                  return {
                    ...prevContact,
                    messages: updatedMessages,
                    lastMessage,
                    unreadCount: prevContact.unreadCount + newMessages.filter((msg: InboxMessage) => !msg.outgoing).length
                  };
                });

                // Scroll to bottom of chat
                setTimeout(() => {
                  if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                  }
                }, 10);
              } else {
                console.log('Force refresh: No new messages found');
              }
            }
          } catch (error) {
            console.error('Error during force refresh of contact messages:', error);
          }
        };

        // Execute the refresh
        loadContactMessages();
      }
    });

    // Cleanup function
    return () => {
      isMounted.current = false;
      stateManager.unregisterComponent('inbox');

      // Remove WebSocket event listeners
      websocketService.off('connection_status', () => {});
      websocketService.off('inbox_data', () => {});
      websocketService.off('new_message', () => {});
      websocketService.off('active_chat_update', () => {});
      websocketService.off('direct_message', () => {});
      websocketService.off('force_refresh_chat', () => {});
      websocketService.off('error', () => {});

      // Remove message sync service event listeners
      messageSyncService.off('active_chat_updated', () => {});
      messageSyncService.off('message_added', () => {});
      messageSyncService.off('messages_synced', () => {});

      // Clear intervals
      clearInterval(refreshInterval);
    };
  }, []);

  return (
    <ComponentCard
      title={viewMode === 'contacts' ? "WhatsApp Inbox" : `Chat with ${activeContact?.displayName}`}
    >
      {/* Header with status indicators and controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => websocketService.requestInbox()}
            className="flex items-center justify-center rounded-md border border-brand-500 bg-brand-500 py-1.5 px-3 text-white hover:bg-brand-600 transition-colors text-sm"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            Refresh
          </button>

          {loading && (
            <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-500 mr-1.5"></div>
              Refreshing...
            </span>
          )}

          {hasNewMessages && !loading && (
            <div className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 rounded-full flex items-center animate-pulse text-xs">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
              </svg>
              New messages
            </div>
          )}

          {/* WhatsApp Status Indicator */}
          {whatsappStatus === 'disconnected' && (
            <div className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-800/30 dark:text-orange-400 rounded-full flex items-center text-xs">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              WhatsApp Disconnected
              <button
                onClick={handleReconnect}
                className="ml-1.5 underline text-orange-800 dark:text-orange-300"
              >
                Reconnect
              </button>
            </div>
          )}

          {whatsappStatus === 'connected' && (
            <div className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400 rounded-full flex items-center text-xs">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              WhatsApp Connected
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Updated: {lastRefreshTime}
          </div>
        </div>
      </div>

      {/* QR Code for reconnection */}
      {showQRCode && whatsappStatus === 'disconnected' && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h3 className="text-sm font-medium mb-2">Scan QR Code to Reconnect WhatsApp</h3>
          <QRCode onStatusChange={(status) => {
            if (status === 'connected') {
              setWhatsappStatus('connected');
              setShowQRCode(false);
              websocketService.requestInbox();
            }
          }} />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400 text-sm">
          <p>{error}</p>
          <button
            onClick={() => {
              setError(null);
              websocketService.requestInbox();
            }}
            className="mt-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && contacts.length === 0 ? (
        <div className="p-6 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-3"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      ) : contacts.length === 0 && messages.length === 0 ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
          </svg>
          <p className="text-sm">No messages in inbox</p>
          <p className="text-xs mt-1">Messages will appear here when you receive them</p>
        </div>
      ) : viewMode === 'contacts' ? (
        // Contacts List View - Compact design
        <div className="max-w-full">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {contacts.map((contact) => (
              <div
                key={contact.phoneNumber}
                className="flex items-center py-3 px-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                onClick={() => handleContactSelect(contact)}
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-3">
                  {contact.displayName.substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {contact.displayName}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                      {new Date(contact.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>

                  <div className="flex items-center mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {contact.lastMessage.message}
                    </p>

                    {contact.unreadCount > 0 && (
                      <div className="ml-2 bg-brand-500 text-white text-xs font-medium rounded-full h-4 min-w-4 flex items-center justify-center px-1 flex-shrink-0">
                        {contact.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Chat View with Active Contact
        <div className="flex flex-col h-[500px]">
          {/* Chat Header */}
          <div className="flex items-center p-3 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={handleBackToContacts}
              className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>

            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-2">
              {activeContact?.displayName.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {activeContact?.displayName}
              </h3>
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeContact && groupMessagesByDate(activeContact.messages).map(group => (
              <div key={group.date} className="mb-4">
                {/* Date separator */}
                <div className="flex justify-center mb-3">
                  <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
                    {formatDate(group.date)}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-2">
                  {group.messages.map((message) => {
                    // Determine if message is incoming or outgoing
                    let isIncoming = false;

                    if (message.sender === 'me') {
                      isIncoming = false;
                    } else if (message.sender.includes('@s.whatsapp.net')) {
                      const senderNumber = message.sender.replace('@s.whatsapp.net', '');
                      isIncoming = senderNumber === activeContact.phoneNumber;
                    } else {
                      isIncoming = false;
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}
                      >
                        {/* Avatar for incoming messages */}
                        {isIncoming && (
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-1.5 self-end mb-0.5">
                            {activeContact.displayName.substring(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-1.5 ${
                            isIncoming
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                              : 'bg-brand-500 text-white rounded-tr-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                          <p className="text-xs mt-0.5 opacity-70 text-right flex items-center justify-end">
                            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}

                            {/* Check mark for sent messages */}
                            {!isIncoming && (
                              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                              </svg>
                            )}
                          </p>
                        </div>

                        {/* Space on the right for outgoing messages */}
                        {!isIncoming && <div className="w-6 ml-1.5"></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Reply Options */}
          <div className="px-3 pt-2 flex flex-wrap gap-1.5">
            {quickReplyOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleQuickReplySelect(option)}
                className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2 py-1 transition-colors"
              >
                {option}
              </button>
            ))}
          </div>

          {/* Reply Form */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-3">
            {isSending && (
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-500 mr-1.5"></div>
                Sending message...
              </div>
            )}
            <form onSubmit={handleSendReply} className="flex items-center">
              <input
                type="text"
                ref={replyInputRef}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-l-md py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-800 dark:text-white"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!replyMessage.trim() || isSending}
                className={`rounded-r-md py-2 px-4 ${
                  replyMessage.trim() && !isSending
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                } transition-colors flex items-center justify-center`}
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </ComponentCard>
  );
};

export default memo(EnhancedInboxTable);