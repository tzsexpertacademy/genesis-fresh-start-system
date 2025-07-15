import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Contact, InboxMessage, BackendConnectionStatus, WhatsAppConnectionStatus } from '../../types/whatsapp';
import websocketService from '../../services/websocketService';

// Define view mode enum
type InboxViewMode = 'contacts' | 'messages' | 'both';

// Define sort options
type MessageSortOption = 'timestamp' | 'contact' | 'unread';

// Define filter options
type MessageFilterOption = 'all' | 'unread' | 'today' | 'thisWeek';

// Mock data for demonstration purposes
const mockMessages: InboxMessage[] = [
  {
    id: '1',
    sender: '+55 11 99999-9999',
    message: 'Hello, this is a test message',
    timestamp: new Date().toISOString(),
    isOutgoing: false,
    status: 'received',
  },
  {
    id: '2',
    sender: '+55 11 88888-8888',
    message: 'Another test message',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isOutgoing: false,
    status: 'received',
  },
];

const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Test Contact 1',
    number: '+55 11 99999-9999',
    lastMessage: 'Hello, this is a test message',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 1,
    avatar: '',
    category: 'general',
  },
  {
    id: '2',
    name: 'Test Contact 2',
    number: '+55 11 88888-8888',
    lastMessage: 'Another test message',
    lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 0,
    avatar: '',
    category: 'general',
  },
];

interface Props {
  className?: string;
}

const EnhancedInboxTable: React.FC<Props> = ({ className = '' }) => {
  // State management
  const [messages, setMessages] = useState<InboxMessage[]>(mockMessages);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<MessageSortOption>('timestamp');
  const [filterBy, setFilterBy] = useState<MessageFilterOption>('all');
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [viewMode, setViewMode] = useState<InboxViewMode>('contacts');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Connection status
  const [, setBackendStatus] = useState<BackendConnectionStatus>('unknown');
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppConnectionStatus>('unknown');
  const [showQRCode, setShowQRCode] = useState<boolean>(false);

  // Quick reply options
  const [quickReplyOptions] = useState<string[]>([
    'Thanks for your message!',
    'I will get back to you soon.',
    'Could you provide more details?',
    'Have a great day!',
  ]);

  // Refs for optimization
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastLoadTime = useRef<number>(0);
  const isInitialized = useRef<boolean>(false);

  // Filter and sort messages
  const filteredAndSortedMessages = useMemo(() => {
    let filtered = messages;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (message) =>
          message.message.toLowerCase().includes(query) ||
          message.sender.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (filterBy) {
      case 'unread':
        filtered = filtered.filter((message) => message.status === 'received');
        break;
      case 'today':
        filtered = filtered.filter(
          (message) => new Date(message.timestamp) >= today
        );
        break;
      case 'thisWeek':
        filtered = filtered.filter(
          (message) => new Date(message.timestamp) >= thisWeek
        );
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'contact':
          return a.sender.localeCompare(b.sender);
        case 'unread':
          if (a.status === 'received' && b.status !== 'received') return -1;
          if (a.status !== 'received' && b.status === 'received') return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [messages, searchQuery, sortBy, filterBy]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.number.toLowerCase().includes(query) ||
        (contact.lastMessage && contact.lastMessage.toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  // Load messages from backend
  const loadMessages = useCallback(async (force = false) => {
    const now = Date.now();

    // Prevent too frequent calls
    if (!force && now - lastLoadTime.current < 5000) {
      console.log('Skipping message load - too recent');
      return;
    }

    lastLoadTime.current = now;

    try {
      setLoading(true);
      setError(null);

      // Mock response for now
      const response = { status: true, data: { messages: mockMessages } };

      if (response.status) {
        const newMessages = response.data?.messages || [];
        setMessages(newMessages);
        setLastRefreshTime(new Date().toLocaleTimeString());
      } else {
        console.error('Failed to load messages:', response.message);
        setError(response.message || 'Failed to load messages');
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load contacts from backend
  const loadContacts = useCallback(async () => {
    try {
      const response = await whatsappService.getContacts();

      if (response.status) {
        const newContacts = response.data?.contacts || [];
        setContacts(newContacts);
      } else {
        console.error('Failed to load contacts:', response.message);
      }
    } catch (error: any) {
      console.error('Error loading contacts:', error);
    }
  }, []);

  // Initialize component
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    console.log('Enhanced Inbox Table initializing...');

    // Load initial data
    loadMessages(true);
    loadContacts();

    // Setup WebSocket listeners
    const handleNewMessage = () => {
      console.log('New message received via WebSocket');
      loadMessages(true);
    };

    const handleConnectionStatus = (status: string) => {
      console.log('Backend connection status:', status);
      setBackendStatus(status as BackendConnectionStatus);
    };

    // Connect to WebSocket
    websocketService.connect();
    websocketService.on('newMessage', handleNewMessage);
    websocketService.on('connectionStatus', handleConnectionStatus);

    // Cleanup
    return () => {
      websocketService.off('newMessage', handleNewMessage);
      websocketService.off('connectionStatus', handleConnectionStatus);
    };
  }, [loadMessages, loadContacts]);

  // Send message function
  const sendMessage = async (message: string, contactNumber: string) => {
    if (!message.trim() || !contactNumber) return;

    try {
      setIsSending(true);
      setError(null);

      const response = await whatsappService.sendMessage({
        number: contactNumber,
        message: message.trim(),
      });

      if (response.status) {
        // Refresh messages after sending
        await loadMessages(true);
      } else {
        setError(response.message || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setViewMode('messages');
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      return 'Just now';
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={`enhanced-inbox-table ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enhanced Inbox
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {lastRefreshTime}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('contacts')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'contacts'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Contacts
              </button>
              <button
                onClick={() => setViewMode('messages')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'messages'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Messages
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadMessages(true)}
              disabled={loading}
              className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search messages or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MessageSortOption)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="timestamp">Sort by Time</option>
            <option value="contact">Sort by Contact</option>
            <option value="unread">Sort by Unread</option>
          </select>

          {/* Filter By */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as MessageFilterOption)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Messages</option>
            <option value="unread">Unread Only</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'contacts' ? (
          // Contacts View
          <div className="h-full overflow-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No contacts found' : 'No contacts available'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactSelect(contact)}
                    className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {contact.name || contact.number}
                          </h3>
                          {contact.unreadCount > 0 && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {contact.lastMessage || 'No messages'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {contact.lastMessageTime && formatTimestamp(contact.lastMessageTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Messages View
          <div className="h-full flex flex-col">
            {selectedContact && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {selectedContact.name || selectedContact.number}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedContact.number}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewMode('contacts')}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4" ref={messagesContainerRef}>
              {filteredAndSortedMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No messages found' : 'No messages available'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedMessages.map((message) => {
                    const isOutgoing = message.isOutgoing;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOutgoing
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            isOutgoing ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message Input */}
            {selectedContact && (
              <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        sendMessage(input.value, selectedContact.number);
                        input.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                      if (input) {
                        sendMessage(input.value, selectedContact.number);
                        input.value = '';
                      }
                    }}
                    disabled={isSending}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>

                {/* Quick Replies */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickReplyOptions.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(reply, selectedContact.number)}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedInboxTable;