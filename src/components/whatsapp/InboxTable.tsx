import React, { useState, useEffect, useRef, memo } from 'react';
import { getInbox, sendTextMessage, getConnectionStatus } from '../../services/whatsappService';
import ComponentCard from '../common/ComponentCard';
import stateManager from '../../utils/stateManager';
import transitionUtils from '../../utils/transitionUtils';

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
  // Pastikan kita memiliki pesan untuk dikelompokkan
  if (!messages || messages.length === 0) {
    return [];
  }

  // Buat salinan pesan untuk diurutkan
  const messagesToSort = [...messages];

  // Urutkan pesan berdasarkan timestamp (dari yang lama ke yang baru)
  // Gunakan try-catch untuk menangani format timestamp yang mungkin tidak valid
  const sortedMessages = messagesToSort.sort((a, b) => {
    try {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();

      // Jika salah satu timestamp tidak valid, gunakan perbandingan string sebagai fallback
      if (isNaN(timeA) || isNaN(timeB)) {
        return a.timestamp.localeCompare(b.timestamp);
      }

      return timeA - timeB;
    } catch (error) {
      console.error('Error sorting messages by timestamp:', error);
      // Fallback ke perbandingan string jika terjadi error
      return a.timestamp.localeCompare(b.timestamp);
    }
  });

  // Log untuk debugging
  console.log('Sorted messages:', sortedMessages.map(m => ({
    message: m.message.substring(0, 20),
    timestamp: m.timestamp,
    time: new Date(m.timestamp).toLocaleTimeString()
  })));

  // Group by date
  const groups: Record<string, InboxMessage[]> = {};

  sortedMessages.forEach(message => {
    try {
      // Gunakan tanggal saja (tanpa waktu) sebagai kunci grup
      const date = new Date(message.timestamp).toDateString();

      if (!groups[date]) {
        groups[date] = [];
      }

      groups[date].push(message);
    } catch (error) {
      console.error('Error grouping message by date:', error, message);
      // Jika terjadi error, tambahkan ke grup "Unknown Date"
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
      // Tangani kasus khusus untuk "Unknown Date"
      if (a.date === 'Unknown Date') return -1;
      if (b.date === 'Unknown Date') return 1;

      // Urutkan tanggal dari yang lama ke yang baru
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (error) {
        return a.date.localeCompare(b.date);
      }
    });

  return groupArray;
};

const InboxTable = () => {
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

  // Reference to track if transitions are disabled

  // Reference to the reply input field
  const replyInputRef = useRef<HTMLInputElement>(null);

  // Format phone number for display
  const formatPhoneNumber = (number: string) => {
    // Remove @s.whatsapp.net suffix
    return number.replace('@s.whatsapp.net', '');
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Track if component is mounted
  const isMounted = useRef(true);

  // Fetch inbox messages with improved optimizations and real-time updates
  const fetchInbox = async (showLoadingIndicator = true) => {
    // Prevent any page reloads during this operation
    const originalBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = (e) => {
      e.preventDefault();
      console.log('Preventing page unload during inbox fetch');
      return '';
    };

    // Skip debouncing for manual refreshes
    if (!showLoadingIndicator && !stateManager.debounce('fetch_inbox', 500)) {
      console.log('Debouncing inbox fetch - too soon since last fetch');
      window.onbeforeunload = originalBeforeUnload;
      return;
    }

    // Store the current fetch timestamp to track this specific request
    const fetchTimestamp = Date.now();
    const fetchId = `inbox_fetch_${fetchTimestamp}`;
    sessionStorage.setItem(fetchId, 'in_progress');

    // Set a global flag to indicate an API request is in progress
    sessionStorage.setItem('api_request_in_progress', 'true');

    try {
      // Show loading indicator but don't block the UI
      if (showLoadingIndicator) {
        setLoading(true);

        // Only set processing state if not already processing and this is a manual refresh
        if (!stateManager.isProcessing()) {
          stateManager.setProcessing(true);
          transitionUtils.disableTransitions(1000);
        }
      }
      setError(null);

      // Register this component as active
      stateManager.registerComponent('inbox');

      console.log('Fetching inbox messages...');

      // Use a try-catch block specifically for the API call
      try {
        // Use a shorter cache TTL for inbox data (5 seconds) to ensure fresher data
        const response = await getInbox();

        // Periksa apakah kita menggunakan data dummy (backend offline)
        const isDummyData = response.message && response.message.includes('dummy');

        // Update backend status
        if (isDummyData) {
          setBackendStatus('offline');
          setUsingDummyData(true);
          console.log('Using dummy data - backend appears to be offline');
        } else {
          setBackendStatus('online');
          setUsingDummyData(false);
        }

        // Check if this component is still mounted and this fetch is still relevant
        if (!isMounted.current || sessionStorage.getItem(fetchId) !== 'in_progress') {
          console.log('Component unmounted or newer fetch in progress, discarding results');
          return;
        }

        // Mark this fetch as complete
        sessionStorage.removeItem(fetchId);

        if (response && response.status) {
          // Only update state if the component is still mounted and data has changed
          // Compare new messages with existing ones to avoid unnecessary re-renders
          const newMessages = response.data?.inbox || [];

          // Use a more reliable comparison that only checks relevant fields
          // This prevents issues with reference equality checks
          const hasChanged = newMessagesHaveChanged(messages, newMessages);

          // Selalu update pesan dan kontak untuk memastikan data terbaru
          // Use a functional update to ensure we're working with the latest state
          setMessages(prevMessages => {
            console.log('Inbox messages updated:', newMessages.length);

            // Schedule an update for inbox
            stateManager.scheduleUpdate('inbox');

            // Update last refresh time
            setLastRefreshTime(new Date().toLocaleTimeString());

            // Check if there are new messages compared to previous state
            const hasNewMessagesAdded = newMessages.length > prevMessages.length;

            if (hasNewMessagesAdded) {
              console.log('New messages detected:', newMessages.length - prevMessages.length);
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

            // Pastikan pesan diurutkan dengan benar sebelum dikelompokkan
            const sortedMessages = [...newMessages].sort((a, b) => {
              try {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              } catch (error) {
                return 0;
              }
            });

            // Group messages by contact
            const groupedContacts = groupMessagesByContact(sortedMessages);

            // Log untuk debugging
            console.log('Setting contacts:', groupedContacts.length);

            // Update contacts state
            if (groupedContacts.length > 0) {
              console.log('Updating contacts with new data');
              setContacts(groupedContacts);
            } else if (newMessages.length > 0) {
              console.log('WARNING: Messages exist but no contacts were created!');
              console.log('First message:', newMessages[0]);

              // Coba lagi dengan pendekatan yang berbeda
              const manualContacts = createContactsManually(newMessages);
              if (manualContacts.length > 0) {
                console.log('Created contacts manually:', manualContacts.length);
                setContacts(manualContacts);
              }
            }

            // If we have an active contact, update it with new messages
            if (activeContact) {
              // Cari kontak yang aktif di daftar kontak yang baru
              const updatedActiveContact = groupedContacts.find(
                contact => contact.phoneNumber === activeContact.phoneNumber
              );

              if (updatedActiveContact) {
                console.log('Updating active contact with new messages:',
                  updatedActiveContact.messages.length);
                setActiveContact(updatedActiveContact);
              } else if (newMessages.length > 0) {
                // Jika kontak aktif tidak ditemukan di daftar kontak baru,
                // coba buat kontak baru dari pesan yang ada
                console.log('Active contact not found in new contacts, creating manually');

                // Filter pesan untuk kontak aktif
                const contactMessages = newMessages.filter(msg => {
                  if (msg.sender.includes('@s.whatsapp.net')) {
                    return msg.sender.replace('@s.whatsapp.net', '') === activeContact.phoneNumber;
                  } else if (msg.sender === 'me') {
                    return true; // Pesan dari kita selalu termasuk
                  }
                  return false;
                });

                if (contactMessages.length > 0) {
                  // Buat kontak baru dengan pesan yang difilter
                  const newActiveContact = {
                    ...activeContact,
                    messages: contactMessages,
                    lastMessage: contactMessages[contactMessages.length - 1]
                  };

                  console.log('Created new active contact manually with', contactMessages.length, 'messages');
                  setActiveContact(newActiveContact);
                }
              }
            }

            return newMessages;
          });

          // Check if there are new messages flag from the backend
          if (response.data?.hasNewMessages) {
            console.log('New messages flag detected from backend');
            // Set a flag in sessionStorage to notify other components
            sessionStorage.setItem('whatsapp_new_messages', 'true');

            // Dispatch a custom event to notify other components
            const newMessageEvent = new CustomEvent('whatsapp_new_message', {
              detail: {
                time: response.data.lastMessageTime,
                id: response.data.lastMessageId
              }
            });
            window.dispatchEvent(newMessageEvent);
          }
        } else if (response) {
          // Handle case where response exists but doesn't have the expected format
          console.log('Response received but in unexpected format:', response);

          // Check if we have any data we can use
          if (response.data && Array.isArray(response.data)) {
            // If data is directly an array, use it
            setMessages(response.data);
            console.log('Using array data directly from response');
          } else if (response.data && response.data.inbox && Array.isArray(response.data.inbox)) {
            // If data.inbox is an array, use it
            setMessages(response.data.inbox);
            console.log('Using inbox array from response.data');
          } else {
            // Only set error if we couldn't extract usable data
            console.error('Invalid inbox response format:', response);
            setError('Invalid response format from server');
          }
        } else {
          // Handle case where response is null or undefined
          console.error('Empty response received');
          setError('No response received from server');
        }
      } catch (apiError: any) {
        console.error('Error in API call:', apiError);
        if (isMounted.current) {
          // Check if this is a connection error
          const isConnectionError = apiError instanceof TypeError &&
            (apiError.message.includes('Failed to fetch') ||
             apiError.message.includes('NetworkError') ||
             apiError.message.includes('Network request failed') ||
             apiError.message.includes('ERR_CONNECTION_REFUSED'));

          if (isConnectionError) {
            setError('Connection error: The backend server appears to be offline.');
          } else {
            setError(apiError.message || 'Failed to fetch inbox messages');
          }
        }
      }
    } catch (error: any) {
      console.error('Error in fetch process:', error);
      if (isMounted.current) {
        setError('An unexpected error occurred while fetching messages.');
      }
    } finally {
      // Clean up the fetch tracking
      sessionStorage.removeItem(fetchId);
      sessionStorage.removeItem('api_request_in_progress');

      // Restore the original beforeunload handler
      window.onbeforeunload = originalBeforeUnload;

      if (isMounted.current) {
        setLoading(false);

        // Allow sidebar animations again after a shorter delay
        if (showLoadingIndicator) {
          setTimeout(() => {
            stateManager.setProcessing(false);
          }, 200);
        }
      }
    }
  };

  // Helper function to compare messages more reliably
  const newMessagesHaveChanged = (oldMessages: InboxMessage[], newMessages: InboxMessage[]): boolean => {
    // Quick length check
    if (oldMessages.length !== newMessages.length) {
      return true;
    }

    // Check if any new messages have different IDs
    const oldIds = new Set(oldMessages.map(msg => msg.id));
    for (const newMsg of newMessages) {
      if (!oldIds.has(newMsg.id)) {
        return true;
      }
    }

    // Check for content changes in messages with the same ID
    for (let i = 0; i < newMessages.length; i++) {
      const newMsg = newMessages[i];
      const oldMsg = oldMessages.find(msg => msg.id === newMsg.id);

      if (!oldMsg ||
          oldMsg.message !== newMsg.message ||
          oldMsg.read !== newMsg.read) {
        return true;
      }
    }

    return false;
  };

  // Helper function to create contacts manually when groupMessagesByContact fails
  const createContactsManually = (messages: InboxMessage[]): Contact[] => {
    console.log('Creating contacts manually from', messages.length, 'messages');

    // Map to store contacts by phone number
    const contactsMap = new Map<string, Contact>();

    // First, identify all unique phone numbers from incoming messages
    const phoneNumbers = new Set<string>();

    messages.forEach(message => {
      if (message.sender.includes('@s.whatsapp.net')) {
        const phoneNumber = message.sender.replace('@s.whatsapp.net', '');
        phoneNumbers.add(phoneNumber);
      }
    });

    console.log('Found', phoneNumbers.size, 'unique phone numbers');

    // For each phone number, create a contact
    phoneNumbers.forEach(phoneNumber => {
      // Filter messages for this contact (both incoming and outgoing)
      const contactMessages = messages.filter(msg => {
        if (msg.sender.includes('@s.whatsapp.net')) {
          return msg.sender.replace('@s.whatsapp.net', '') === phoneNumber;
        } else if (msg.sender === 'me') {
          // For outgoing messages, we need to check if there are any incoming messages
          // from this contact before or after this message
          const hasRelatedMessages = messages.some(otherMsg =>
            otherMsg.sender.includes('@s.whatsapp.net') &&
            otherMsg.sender.replace('@s.whatsapp.net', '') === phoneNumber
          );
          return hasRelatedMessages;
        }
        return false;
      });

      if (contactMessages.length > 0) {
        // Sort messages by timestamp (newest first)
        const sortedMessages = [...contactMessages].sort((a, b) => {
          try {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          } catch (error) {
            return 0;
          }
        });

        // Create contact
        contactsMap.set(phoneNumber, {
          phoneNumber,
          displayName: phoneNumber, // Use phone number as display name
          lastMessage: sortedMessages[0], // Newest message
          unreadCount: sortedMessages.filter(msg => !msg.read).length,
          messages: sortedMessages
        });
      }
    });

    // Convert map to array and sort by last message timestamp (newest first)
    return Array.from(contactsMap.values())
      .sort((a, b) => {
        try {
          return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
        } catch (error) {
          return 0;
        }
      });
  };

  // Function to group messages by contact
  const groupMessagesByContact = (messages: InboxMessage[]): Contact[] => {
    // Pastikan kita memiliki pesan untuk dikelompokkan
    if (!messages || messages.length === 0) {
      return [];
    }

    console.log('Grouping messages by contact, total messages:', messages.length);

    const contactsMap = new Map<string, Contact>();

    // Buat salinan pesan untuk diurutkan
    const messagesToSort = [...messages];

    // Sort messages by timestamp (newest first) with error handling
    const sortedMessages = messagesToSort.sort((a, b) => {
      try {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();

        // Jika salah satu timestamp tidak valid, gunakan perbandingan string sebagai fallback
        if (isNaN(timeA) || isNaN(timeB)) {
          return b.timestamp.localeCompare(a.timestamp); // Reverse untuk newest first
        }

        return timeB - timeA; // Newest first
      } catch (error) {
        console.error('Error sorting messages by timestamp:', error);
        // Fallback ke perbandingan string jika terjadi error
        return b.timestamp.localeCompare(a.timestamp); // Reverse untuk newest first
      }
    });

    // Log untuk debugging
    console.log('Sorted messages for contacts:', sortedMessages.map(m => ({
      sender: m.sender,
      message: m.message.substring(0, 20),
      timestamp: m.timestamp,
      time: new Date(m.timestamp).toLocaleTimeString()
    })));

    // Group messages by sender
    sortedMessages.forEach(message => {
      try {
        // Normalize sender format - remove WhatsApp suffix if present
        let phoneNumber = message.sender;
        let isOutgoing = false;

        if (message.sender.includes('@s.whatsapp.net')) {
          // Pesan masuk dari kontak WhatsApp
          phoneNumber = message.sender.replace('@s.whatsapp.net', '');
          isOutgoing = false;
        } else if (message.sender === 'me') {
          // Pesan keluar sementara yang kita tambahkan untuk optimistic updates
          // Kita perlu menentukan nomor kontak tujuan
          // Gunakan activeContact jika ada, atau cari dari pesan lain
          isOutgoing = true;

          // Jika ada activeContact, gunakan nomor teleponnya
          if (activeContact) {
            phoneNumber = activeContact.phoneNumber;
          } else {
            // Cari pesan masuk terakhir untuk mendapatkan nomor kontak
            const lastIncomingMessage = messagesToSort.find(m => m.sender.includes('@s.whatsapp.net'));
            if (lastIncomingMessage) {
              phoneNumber = lastIncomingMessage.sender.replace('@s.whatsapp.net', '');
            } else {
              // Jika tidak ada pesan masuk, gunakan fallback
              console.warn('No incoming message found to determine contact for outgoing message');
              phoneNumber = 'unknown-contact';
            }
          }
        } else {
          // Pesan lain yang tidak memiliki format khusus
          // Asumsikan ini adalah pesan keluar
          isOutgoing = true;

          // Coba tentukan nomor kontak tujuan
          if (activeContact) {
            phoneNumber = activeContact.phoneNumber;
          }
        }

        // Jika nomor telepon kosong, gunakan fallback
        if (!phoneNumber || phoneNumber.trim() === '') {
          phoneNumber = 'unknown-' + Math.random().toString(36).substring(7);
          console.warn('Empty phone number detected, using fallback:', phoneNumber);
        }

        if (!contactsMap.has(phoneNumber)) {
          // Buat kontak baru
          contactsMap.set(phoneNumber, {
            phoneNumber,
            displayName: phoneNumber, // Use phone number as display name for now
            lastMessage: message,
            unreadCount: message.read ? 0 : 1,
            messages: [message]
          });
        } else {
          // Update kontak yang sudah ada
          const contact = contactsMap.get(phoneNumber)!;

          // Tambahkan pesan ke daftar pesan kontak
          contact.messages.push(message);

          // Update unread count
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
            // Fallback: selalu gunakan pesan terbaru dalam urutan array
            contact.lastMessage = message;
          }
        }
      } catch (error) {
        console.error('Error processing message for contact grouping:', error, message);
      }
    });

    // Convert map to array and sort by last message timestamp (newest first)
    const contactsArray = Array.from(contactsMap.values());

    // Sort contacts by last message timestamp (newest first)
    const sortedContacts = contactsArray.sort((a, b) => {
      try {
        const timeA = new Date(a.lastMessage.timestamp).getTime();
        const timeB = new Date(b.lastMessage.timestamp).getTime();

        // Jika salah satu timestamp tidak valid, gunakan perbandingan string sebagai fallback
        if (isNaN(timeA) || isNaN(timeB)) {
          return b.lastMessage.timestamp.localeCompare(a.lastMessage.timestamp);
        }

        return timeB - timeA; // Newest first
      } catch (error) {
        console.error('Error sorting contacts by timestamp:', error);
        // Fallback ke perbandingan string jika terjadi error
        return b.lastMessage.timestamp.localeCompare(a.lastMessage.timestamp);
      }
    });

    console.log('Grouped contacts:', sortedContacts.map(c => ({
      phoneNumber: c.phoneNumber,
      messageCount: c.messages.length,
      lastMessage: c.lastMessage.message.substring(0, 20),
      timestamp: c.lastMessage.timestamp
    })));

    return sortedContacts;
  };

  // Handle refresh interval change
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(Number(e.target.value));
  };

  // Function to handle selecting a contact
  const handleContactSelect = (contact: Contact) => {
    setActiveContact(contact);
    setViewMode('chat');

    // Focus on reply input after a short delay to allow rendering
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus();
      }
    }, 100);
  };

  // Function to go back to contacts list
  const handleBackToContacts = () => {
    setViewMode('contacts');
    setActiveContact(null);
  };

  // Function to check WhatsApp connection status
  const checkWhatsAppStatus = async () => {
    try {
      const response = await getConnectionStatus();

      if (response && response.status) {
        const status = response.data?.status;

        if (status === 'connected') {
          setWhatsappStatus('connected');
        } else {
          setWhatsappStatus('disconnected');
        }

        console.log('WhatsApp connection status:', status);
      } else {
        setWhatsappStatus('unknown');
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setWhatsappStatus('unknown');
    }
  };

  // Function to handle sending a reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeContact || !replyMessage.trim()) {
      return;
    }

    try {
      setLoading(true);

      // Simpan pesan yang akan dikirim
      const messageToSend = replyMessage;

      // Clear the input field immediately untuk UX yang lebih baik
      setReplyMessage('');

      // Tambahkan pesan sementara ke daftar pesan (optimistic update)
      // Ini akan membuat pesan terlihat segera tanpa menunggu respons API
      const tempMessage: InboxMessage = {
        id: `temp-${Date.now()}`,
        sender: 'me', // Gunakan 'me' untuk menandai pesan dari kita
        message: messageToSend,
        timestamp: new Date().toISOString(),
        read: true
      };

      // Update active contact dengan pesan sementara
      if (activeContact) {
        const updatedMessages = [...activeContact.messages, tempMessage];
        const updatedContact = {
          ...activeContact,
          messages: updatedMessages,
          lastMessage: tempMessage
        };
        setActiveContact(updatedContact);

        // Juga update messages dan contacts global untuk memastikan pesan terlihat di semua tampilan
        setMessages(prevMessages => {
          // Tambahkan pesan sementara ke daftar pesan global
          const newMessages = [...prevMessages, tempMessage];

          // Update contacts dengan pesan baru
          const updatedContacts = groupMessagesByContact(newMessages);
          setContacts(updatedContacts);

          return newMessages;
        });
      }

      // Send the message
      const response = await sendTextMessage(activeContact.phoneNumber, messageToSend);

      if (response && response.status) {
        console.log('Message sent successfully:', response);

        // Refresh the inbox to show the sent message with ID yang benar dari server
        fetchInbox(false);

        // Tambahkan refresh kedua setelah delay untuk memastikan pesan terlihat
        setTimeout(() => {
          if (isMounted.current) {
            fetchInbox(false);
          }
        }, 1000);

        // Tambahkan refresh ketiga dengan delay lebih lama
        setTimeout(() => {
          if (isMounted.current) {
            console.log('Performing final refresh to ensure message visibility');
            fetchInbox(true); // Gunakan true untuk memastikan UI diperbarui
          }
        }, 3000);
      } else {
        console.error('Failed to send message:', response);

        // Check if this is a WhatsApp connection error
        if (response.message && response.message.includes('WhatsApp is not connected')) {
          alert('WhatsApp is not connected. Please scan the QR code in the Status tab to connect WhatsApp.');
        } else {
          alert('Failed to send message. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Check if this is a WhatsApp connection error
      if (error.message && error.message.includes('WhatsApp is not connected')) {
        alert('WhatsApp is not connected. Please scan the QR code in the Status tab to connect WhatsApp.');
      } else {
        alert('Error sending message. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages on component mount and periodically with improved real-time handling
  useEffect(() => {
    // Reset mounted flag
    isMounted.current = true;

    // Register this component as active
    stateManager.registerComponent('inbox');

    console.log('InboxTable mounted, fetching messages...');

    // Use a short timeout before initial fetch to allow the component to fully mount
    // This helps prevent the flickering issue
    const initialFetchTimeout = setTimeout(() => {
      // Initial fetch with loading indicator
      fetchInbox(true);
    }, 100);

    // Check WhatsApp connection status
    checkWhatsAppStatus();

    // Set up polling interval with improved handling for real-time updates
    let interval: NodeJS.Timeout | null = null;
    let statusInterval: NodeJS.Timeout | null = null;

    // Gunakan interval refresh yang sangat pendek (3 detik) untuk memastikan pesan baru terlihat sangat cepat
    const realTimeRefreshInterval = 3; // 3 seconds
    const statusCheckInterval = 10; // 10 seconds
    const forceRefreshIntervalDuration = 15; // 15 seconds

    console.log(`Setting up auto-refresh every ${realTimeRefreshInterval} seconds for real-time updates`);
    console.log(`Setting up force refresh every ${forceRefreshIntervalDuration} seconds for better reliability`);
    console.log(`Setting up WhatsApp status check every ${statusCheckInterval} seconds`);

    // For subsequent fetches, don't show loading indicator
    interval = setInterval(() => {
      if (isMounted.current) {
        // Always allow refreshes to ensure real-time updates
        console.log('Auto-refreshing inbox for real-time updates...');
        // Use a silent fetch that doesn't trigger UI updates unless there are new messages
        fetchInbox(false);
      }
    }, realTimeRefreshInterval * 1000);

    // Create a listener for WhatsApp message events from custom events
    const handleNewMessage = (e: Event) => {
      if (isMounted.current) {
        console.log('New WhatsApp messages detected via custom event, refreshing inbox...');
        // Fetch without showing loading indicator
        fetchInbox(false);
      }
    };

    // Create a listener for force refresh events
    const handleForceRefresh = (e: Event) => {
      if (isMounted.current) {
        console.log('Force refresh event received, immediately refreshing inbox...');
        // Fetch with loading indicator for force refresh
        fetchInbox(true);

        // Set new messages flag to true to show notification
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
    };

    // Listen for the custom events
    window.addEventListener('whatsapp_new_message', handleNewMessage);
    window.addEventListener('whatsapp_force_refresh', handleForceRefresh);

    // Also check sessionStorage more frequently for real-time updates
    const checkForNewMessages = () => {
      const hasNewMessages = sessionStorage.getItem('whatsapp_new_messages') === 'true';
      if (hasNewMessages && isMounted.current) {
        console.log('New WhatsApp messages detected from sessionStorage, refreshing inbox...');
        // Clear the flag
        sessionStorage.removeItem('whatsapp_new_messages');
        // Fetch without showing loading indicator
        fetchInbox(false);
      }
    };

    // Set up an interval to check for new messages more frequently for better real-time updates
    const messageCheckInterval = setInterval(checkForNewMessages, 2000);

    // Also listen for storage events (in case another tab sets the flag)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'whatsapp_new_messages' && e.newValue === 'true') {
        checkForNewMessages();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Set up a manual refresh button click handler
    const handleRefreshClick = () => {
      if (isMounted.current) {
        console.log('Manual refresh requested');
        fetchInbox(true);
      }
    };

    // Add a global event listener for manual refresh
    window.addEventListener('whatsapp_manual_refresh', handleRefreshClick);

    // Set up interval to check WhatsApp connection status
    statusInterval = setInterval(() => {
      if (isMounted.current) {
        console.log('Checking WhatsApp connection status...');
        checkWhatsAppStatus();
      }
    }, statusCheckInterval * 1000);

    // Set up interval for force refresh to ensure we always have the latest data
    const forceRefreshIntervalId = setInterval(() => {
      if (isMounted.current) {
        console.log('Performing periodic force refresh for better reliability');
        fetchInbox(true); // Use true to force UI update
      }
    }, forceRefreshIntervalDuration * 1000); // Use the interval duration defined above

    // Cleanup function
    return () => {
      console.log('InboxTable unmounting, cleaning up...');
      clearTimeout(initialFetchTimeout);
      clearInterval(messageCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('whatsapp_new_message', handleNewMessage);
      window.removeEventListener('whatsapp_force_refresh', handleForceRefresh);
      window.removeEventListener('whatsapp_manual_refresh', handleRefreshClick);
      isMounted.current = false;
      stateManager.unregisterComponent('inbox');

      if (interval) {
        console.log('Clearing refresh interval');
        clearInterval(interval);
      }

      if (statusInterval) {
        console.log('Clearing WhatsApp status check interval');
        clearInterval(statusInterval);
      }

      if (forceRefreshIntervalId) {
        console.log('Clearing force refresh interval');
        clearInterval(forceRefreshIntervalId);
      }
    };
  }, [refreshInterval]); // Don't include messages in the dependency array to avoid unnecessary re-renders

  return (
    <ComponentCard
      title={viewMode === 'contacts' ? "WhatsApp Contacts" : `Chat with ${activeContact?.displayName}`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <button
            onClick={() => {
              // Trigger manual refresh with loading indicator
              fetchInbox(true);

              // Dispatch a global event for other components
              window.dispatchEvent(new Event('whatsapp_manual_refresh'));

              console.log('Manual refresh button clicked');

              // Reset new messages flag
              setHasNewMessages(false);
            }}
            className="flex items-center justify-center rounded-md border border-brand-500 bg-brand-500 py-2 px-4 text-white hover:bg-brand-600 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Refresh Inbox
          </button>

          {loading && (
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500 mr-2"></div>
              Refreshing...
            </span>
          )}

          {hasNewMessages && !loading && (
            <div className="ml-3 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 rounded-full flex items-center animate-pulse">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
              </svg>
              New messages received!
            </div>
          )}

          {/* Backend Status Indicator */}
          {backendStatus === 'offline' && (
            <div className="ml-3 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-400 rounded-full flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              Backend Offline
            </div>
          )}

          {usingDummyData && (
            <div className="ml-3 px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-400 rounded-full flex items-center text-xs">
              Using Demo Data
            </div>
          )}

          {/* WhatsApp Status Indicator */}
          {whatsappStatus === 'disconnected' && (
            <div className="ml-3 px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-800/30 dark:text-orange-400 rounded-full flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              WhatsApp Not Connected
            </div>
          )}

          {whatsappStatus === 'connected' && (
            <div className="ml-3 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400 rounded-full flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              WhatsApp Connected
            </div>
          )}

          <div className="ml-3 text-xs text-gray-500 dark:text-gray-400">
            Last updated: {lastRefreshTime}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh:</label>
          <select
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
            className="border border-gray-200 rounded px-2 py-1 text-sm bg-transparent dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
          >
            <option value="0">Off</option>
            <option value="10">10s</option>
            <option value="30">30s</option>
            <option value="60">1m</option>
            <option value="300">5m</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400">
          <p>{error}</p>
          {error.includes('Failed to fetch') || error.includes('connection') ? (
            <>
              <p className="mt-2 text-sm">
                The backend server appears to be offline. Please make sure the server is running.
              </p>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={() => {
                    // Trigger manual refresh with loading indicator
                    fetchInbox(true);

                    // Dispatch a global event for other components
                    window.dispatchEvent(new Event('whatsapp_manual_refresh'));

                    console.log('Try again button clicked');
                  }}
                  className="text-sm bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 px-3 py-1 rounded"
                >
                  Try again
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                // Trigger manual refresh with loading indicator
                fetchInbox(true);

                // Dispatch a global event for other components
                window.dispatchEvent(new Event('whatsapp_manual_refresh'));

                console.log('Try again button clicked');
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* Backend Offline Helper Message */}
      {backendStatus === 'offline' && !error && (
        <div className="p-4 mb-4 bg-yellow-50 text-yellow-700 rounded-md dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/30">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            <div>
              <h3 className="font-medium">Backend Server Offline</h3>
              <p className="mt-1 text-sm">
                The backend server appears to be offline. You're currently viewing demo data.
              </p>
              <p className="mt-1 text-sm">
                To see your actual WhatsApp messages, please start the backend server by running:
              </p>
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                cd backend && pnpm dev
              </div>
              <button
                onClick={() => {
                  // Trigger manual refresh with loading indicator
                  fetchInbox(true);
                }}
                className="mt-3 text-sm bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-500/20 dark:hover:bg-yellow-500/30 px-3 py-1 rounded"
              >
                Check Connection Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Not Connected Helper Message */}
      {whatsappStatus === 'disconnected' && backendStatus === 'online' && !error && (
        <div className="p-4 mb-4 bg-orange-50 text-orange-700 rounded-md dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <div>
              <h3 className="font-medium">WhatsApp Not Connected</h3>
              <p className="mt-1 text-sm">
                Your WhatsApp account is not connected. You need to scan the QR code to connect WhatsApp.
              </p>
              <p className="mt-1 text-sm">
                Please go to the <strong>Status</strong> tab and scan the QR code with your phone to connect WhatsApp.
              </p>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={() => {
                    // Navigate to Status page
                    window.location.href = '/status';
                  }}
                  className="text-sm bg-orange-100 hover:bg-orange-200 dark:bg-orange-500/20 dark:hover:bg-orange-500/30 px-3 py-1 rounded"
                >
                  Go to Status Page
                </button>
                <button
                  onClick={() => {
                    // Check WhatsApp status again
                    checkWhatsAppStatus();
                  }}
                  className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded"
                >
                  Check Connection Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && contacts.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400 m-4">
          <p className="font-medium">Error loading messages</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => {
              // Trigger manual refresh with loading indicator
              fetchInbox(true);

              // Dispatch a global event for other components
              window.dispatchEvent(new Event('whatsapp_manual_refresh'));

              console.log('Try again button clicked');
            }}
            className="mt-3 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 px-3 py-1 rounded"
          >
            Try Again
          </button>
        </div>
      ) : contacts.length === 0 && messages.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
          </svg>
          <p>No messages in inbox</p>
          <p className="text-sm mt-1">Messages will appear here when you receive them</p>

          {/* Tombol untuk refresh manual */}
          <button
            onClick={() => {
              console.log('Manual refresh from empty state');
              fetchInbox(true);
            }}
            className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
          >
            Refresh Inbox
          </button>
        </div>
      ) : contacts.length === 0 && messages.length > 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-yellow-300 dark:text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p>Messages detected but not displayed</p>
          <p className="text-sm mt-1">There are {messages.length} messages in the system but they couldn't be grouped properly.</p>

          {/* Debug info */}
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-left text-xs overflow-auto max-h-40">
            <p className="font-semibold">Debug Info:</p>
            <p>Messages count: {messages.length}</p>
            <p>Contacts count: {contacts.length}</p>
            <p>First message sender: {messages.length > 0 ? messages[0].sender : 'N/A'}</p>
            <p>First message content: {messages.length > 0 ? messages[0].message.substring(0, 30) : 'N/A'}</p>
          </div>

          {/* Tombol untuk refresh manual */}
          <button
            onClick={() => {
              console.log('Manual refresh from error state');
              fetchInbox(true);
            }}
            className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
          >
            Refresh Inbox
          </button>
        </div>
      ) : viewMode === 'contacts' ? (
        // Contacts List View
        <div className="max-w-full">
          {/* Small loading indicator for background refreshes */}
          {loading && contacts.length > 0 && (
            <div className="absolute top-4 right-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
            </div>
          )}

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {contacts.map((contact) => (
              <div
                key={contact.phoneNumber}
                className="flex items-center py-4 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                onClick={() => handleContactSelect(contact)}
              >
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-4">
                  {contact.displayName.substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {contact.displayName}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(contact.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                    {contact.lastMessage.message}
                  </p>
                </div>

                {contact.unreadCount > 0 && (
                  <div className="ml-3 bg-brand-500 text-white text-xs font-medium rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                    {contact.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Chat View with Active Contact
        <div className="flex flex-col h-[500px]">
          {/* Chat Header */}
          <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={handleBackToContacts}
              className="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>

            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-3">
              {activeContact?.displayName.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {activeContact?.displayName}
              </h3>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeContact && groupMessagesByDate(activeContact.messages).map(group => (
              <div key={group.date} className="mb-6">
                {/* Date separator */}
                <div className="flex justify-center mb-4">
                  <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
                    {formatDate(group.date)}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {group.messages.map((message) => {
                    // Determine if message is from contact (incoming) or from us (outgoing)

                    // Ada beberapa kasus yang perlu ditangani:
                    // 1. Pesan dari kontak akan memiliki format nomor@s.whatsapp.net - ini adalah incoming
                    // 2. Pesan dari kita mungkin memiliki sender 'me' (untuk pesan sementara) - ini adalah outgoing
                    // 3. Pesan dari kita mungkin memiliki sender yang berbeda dari nomor kontak - ini adalah outgoing

                    let isIncoming = false;

                    if (message.sender === 'me') {
                      // Pesan sementara yang kita tambahkan untuk optimistic updates
                      isIncoming = false;
                    } else if (message.sender.includes('@s.whatsapp.net')) {
                      // Pesan dari kontak WhatsApp
                      const senderNumber = message.sender.replace('@s.whatsapp.net', '');
                      // Pesan adalah incoming jika nomor pengirim sama dengan nomor kontak yang aktif
                      isIncoming = senderNumber === activeContact.phoneNumber;
                    } else {
                      // Pesan lainnya, kemungkinan besar dari kita
                      isIncoming = false;
                    }

                    // Log untuk debugging
                    console.log(`Message: ${message.message.substring(0, 20)}... | Sender: ${message.sender} | isIncoming: ${isIncoming}`);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}
                      >
                        {/* Avatar untuk pesan masuk */}
                        {isIncoming && (
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-2 self-end mb-1">
                            {activeContact.displayName.substring(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div
                          className={`max-w-xs rounded-lg px-4 py-2 ${
                            isIncoming
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                              : 'bg-brand-500 text-white rounded-tr-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.message}</p>
                          <p className="text-xs mt-1 opacity-70 text-right flex items-center justify-end">
                            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}

                            {/* Tanda centang untuk pesan terkirim */}
                            {!isIncoming && (
                              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                              </svg>
                            )}
                          </p>
                        </div>

                        {/* Spasi di sebelah kanan untuk pesan terkirim */}
                        {!isIncoming && <div className="w-8 ml-2"></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-4">
            <form onSubmit={handleSendReply} className="flex items-center">
              <input
                type="text"
                ref={replyInputRef}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-200 rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !replyMessage.trim()}
                className="bg-brand-500 text-white rounded-r-lg py-2 px-4 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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

// Use memo to prevent unnecessary re-renders
export default memo(InboxTable);
