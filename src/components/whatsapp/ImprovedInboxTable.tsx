import React, { useState, useEffect, useRef, memo } from 'react';
import { getInbox, sendTextMessage, getConnectionStatus } from '../../services/whatsappService';
import ComponentCard from '../common/ComponentCard';
import stateManager from '../../utils/stateManager';
import transitionUtils from '../../utils/transitionUtils';
import QRCode from './QRCode';

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

interface InboxMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface Contact {
  phoneNumber: string;
  displayName: string;
  lastMessage: InboxMessage;
  unreadCount: number;
  messages: InboxMessage[];
}

// Interface for grouped messages by date
interface MessageGroup {
  date: string;
  messages: InboxMessage[];
}

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

const ImprovedInboxTable = () => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // seconds
  const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [viewMode, setViewMode] = useState<'contacts' | 'chat'>('contacts');
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [usingDummyData, setUsingDummyData] = useState<boolean>(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [quickReplyOptions, setQuickReplyOptions] = useState<string[]>([
    "Hello, how can I help you?",
    "Thank you for your message.",
    "I will get back to you shortly.",
    "Could you provide more details?"
  ]);

  // Track component state

  // Reference to the reply input field
  const replyInputRef = useRef<HTMLInputElement>(null);

  // Track if component is mounted
  const isMounted = useRef(true);

  // Chat container ref for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
        let phoneNumber = message.sender;
        let isOutgoing = false;

        if (message.sender.includes('@s.whatsapp.net')) {
          // Incoming message from WhatsApp contact
          phoneNumber = message.sender.replace('@s.whatsapp.net', '');
          isOutgoing = false;
        } else if (message.sender === 'me') {
          // Outgoing message (temporary for optimistic updates)
          isOutgoing = true;

          if (activeContact) {
            phoneNumber = activeContact.phoneNumber;
          } else {
            const lastIncomingMessage = messagesToSort.find(m => m.sender.includes('@s.whatsapp.net'));
            if (lastIncomingMessage) {
              phoneNumber = lastIncomingMessage.sender.replace('@s.whatsapp.net', '');
            } else {
              phoneNumber = 'unknown-contact';
            }
          }
        } else {
          // Other messages, likely outgoing
          isOutgoing = true;
          if (activeContact) {
            phoneNumber = activeContact.phoneNumber;
          }
        }

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

  // Fetch WhatsApp connection status
  const checkWhatsAppStatus = async () => {
    try {
      const response = await getConnectionStatus();

      if (response && response.status) {
        const status = response.data?.status;

        if (status === 'connected') {
          setWhatsappStatus('connected');
          setShowQRCode(false);
        } else {
          setWhatsappStatus('disconnected');
        }
      } else {
        setWhatsappStatus('unknown');
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setWhatsappStatus('unknown');
    }
  };

  // Fetch inbox messages
  const fetchInbox = async (showLoadingIndicator = true) => {
    // Store the current active contact phone number to maintain selection after refresh
    const currentActiveContactPhone = activeContact?.phoneNumber;

    // Only show loading indicator if explicitly requested (for manual refreshes)
    if (showLoadingIndicator) {
      setLoading(true);
      transitionUtils.disableTransitions(1000);
    }

    setError(null);

    try {
      // Fetch the latest messages from the server
      const response = await getInbox();

      // Check if using dummy data (backend offline)
      const isDummyData = response.message && response.message.includes('dummy');

      if (isDummyData) {
        setBackendStatus('offline');
        setUsingDummyData(true);
      } else {
        setBackendStatus('online');
        setUsingDummyData(false);
      }

      if (response && response.status) {
        // Extract the new messages from the response
        const newMessages = response.data?.inbox || [];

        // Update the messages state and perform related updates
        setMessages(prevMessages => {
          // Always update the last refresh time
          setLastRefreshTime(new Date().toLocaleTimeString());

          // Check if there are new messages by comparing lengths
          // This is a simple heuristic but works for most cases
          const hasNewMessagesAdded = newMessages.length > prevMessages.length;

          // If we have new messages, show a notification
          if (hasNewMessagesAdded) {
            setHasNewMessages(true);

            // Auto-clear the new messages flag after 5 seconds
            setTimeout(() => {
              if (isMounted.current) {
                setHasNewMessages(false);
              }
            }, 5000);

            // Play notification sound if available
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.log('Could not play notification sound:', e));
            } catch (error) {
              console.log('Audio notification not supported');
            }
          }

          // Group messages by contact to update the contacts list
          const groupedContacts = groupMessagesByContact(newMessages);
          setContacts(groupedContacts);

          // If we had an active contact, find it in the updated contacts list
          if (currentActiveContactPhone) {
            const updatedActiveContact = groupedContacts.find(
              contact => contact.phoneNumber === currentActiveContactPhone
            );

            // If we found the contact, update the active contact state
            if (updatedActiveContact) {
              // Check if we have new messages for this contact
              const hadNewMessages =
                !activeContact ||
                updatedActiveContact.messages.length > activeContact.messages.length;

              // Update the active contact
              setActiveContact(updatedActiveContact);

              // If we have new messages, scroll to the bottom
              if (hadNewMessages) {
                // Use a very short timeout to ensure the DOM has updated
                setTimeout(() => {
                  if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                  }
                }, 10);
              }
            }
          }

          // Return the new messages to update the state
          return newMessages;
        });
      } else {
        setError('Invalid response format from server');
      }
    } catch (error: any) {
      console.error('Error fetching inbox:', error);
      setError(error.message || 'Failed to fetch inbox messages');

      // Check if this is a connection error
      if (error instanceof TypeError &&
          (error.message.includes('Failed to fetch') ||
           error.message.includes('NetworkError'))) {
        setBackendStatus('offline');
      }
    } finally {
      // Only clear loading state if we were showing it
      if (showLoadingIndicator) {
        setLoading(false);
        // No need to explicitly re-enable transitions
      }
    }
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
        }, 10); // Use a very short timeout to ensure the DOM has updated
      }

      // Show a subtle sending indicator
      const sendingIndicator = document.createElement('div');
      sendingIndicator.className = 'text-xs text-gray-500 dark:text-gray-400 animate-pulse';
      sendingIndicator.textContent = 'Sending...';

      // Send the message to the server
      const response = await sendTextMessage(activeContact.phoneNumber, messageToSend);

      if (response && response.status) {
        console.log('Message sent successfully:', response);

        // Immediately fetch the inbox to get the real message with the correct ID
        await fetchInbox(false);

        // Add a second refresh after a short delay to ensure we have the latest data
        // This helps in case the server takes a moment to process the message
        setTimeout(async () => {
          if (isMounted.current) {
            await fetchInbox(false);

            // Scroll to bottom again after the refresh
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 10);
          }
        }, 500);
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

  // Handle refresh interval change
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(Number(e.target.value));
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

  // Initialize component and set up polling
  useEffect(() => {
    // Set component as mounted
    isMounted.current = true;

    // Register component as active
    stateManager.registerComponent('inbox');

    // Initial fetch with short delay to prevent flickering
    const initialFetchTimeout = setTimeout(() => {
      fetchInbox(true);
    }, 100);

    // Check WhatsApp connection status
    checkWhatsAppStatus();

    // Set up polling intervals
    const refreshIntervalId = setInterval(() => {
      if (isMounted.current) {
        fetchInbox(false);
      }
    }, 5000); // Poll every 5 seconds for real-time updates

    const statusCheckIntervalId = setInterval(() => {
      if (isMounted.current) {
        checkWhatsAppStatus();
      }
    }, 10000); // Check status every 10 seconds

    // Force refresh every 30 seconds
    const forceRefreshIntervalId = setInterval(() => {
      if (isMounted.current) {
        fetchInbox(true);
      }
    }, 30000);

    // Set up event listeners for new messages
    const handleNewMessage = () => {
      if (isMounted.current) {
        fetchInbox(false);
      }
    };

    window.addEventListener('whatsapp_new_message', handleNewMessage);

    // Cleanup function
    return () => {
      isMounted.current = false;
      clearTimeout(initialFetchTimeout);
      clearInterval(refreshIntervalId);
      clearInterval(statusCheckIntervalId);
      clearInterval(forceRefreshIntervalId);
      window.removeEventListener('whatsapp_new_message', handleNewMessage);
      stateManager.unregisterComponent('inbox');
    };
  }, [refreshInterval]);

  return (
    <ComponentCard
      title={viewMode === 'contacts' ? "WhatsApp Inbox" : `Chat with ${activeContact?.displayName}`}
    >
      {/* Header with status indicators and controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => fetchInbox(true)}
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

        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">Auto-refresh:</label>
          <select
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-transparent dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
          >
            <option value="0">Off</option>
            <option value="10">10s</option>
            <option value="30">30s</option>
            <option value="60">1m</option>
            <option value="300">5m</option>
          </select>
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
              fetchInbox(true);
            }
          }} />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400 text-sm">
          <p>{error}</p>
          <button
            onClick={() => fetchInbox(true)}
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

export default memo(ImprovedInboxTable);