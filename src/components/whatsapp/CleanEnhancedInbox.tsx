import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Contact, InboxMessage } from '../../types/whatsapp';

// Define view mode enum
type InboxViewMode = 'contacts' | 'chat';

interface Props {
  className?: string;
}

const CleanEnhancedInbox: React.FC<Props> = ({ className = '' }) => {
  // State management
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<InboxViewMode>('contacts');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [replyMessage, setReplyMessage] = useState<string>('');

  // Refs for optimization
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Mock data generator
  const generateMockData = useCallback(() => {
    const mockContacts: Contact[] = [
      {
        id: '1',
        name: 'João Silva',
        number: '+5511999999999',
        phoneNumber: '+5511999999999',
        displayName: 'João Silva',
        lastMessage: {
          id: '1',
          sender: '+5511999999999',
          message: 'Olá, como está?',
          timestamp: new Date().toISOString(),
          read: false,
          outgoing: false
        },
        lastMessageTime: new Date().toISOString(),
        unreadCount: 1,
        messages: [
          {
            id: '1',
            sender: '+5511999999999',
            message: 'Olá, como está?',
            timestamp: new Date().toISOString(),
            read: false,
            outgoing: false
          }
        ]
      },
      {
        id: '2',
        name: 'Maria Santos',
        number: '+5511888888888',
        phoneNumber: '+5511888888888',
        displayName: 'Maria Santos',
        lastMessage: {
          id: '2',
          sender: '+5511888888888',
          message: 'Obrigada pela informação!',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: true,
          outgoing: false
        },
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 0,
        messages: [
          {
            id: '2',
            sender: '+5511888888888',
            message: 'Obrigada pela informação!',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: true,
            outgoing: false
          }
        ]
      }
    ];
    return mockContacts;
  }, []);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (contact) =>
        contact.displayName?.toLowerCase().includes(query) ||
        contact.phoneNumber?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Load initial data
  useEffect(() => {
    setLoading(true);
    const mockContacts = generateMockData();
    setContacts(mockContacts);
    setLoading(false);
  }, [generateMockData]);

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setActiveContact(contact);
    setViewMode('chat');
  };

  // Handle back to contacts
  const handleBackToContacts = () => {
    setViewMode('contacts');
    setActiveContact(null);
  };

  // Handle send reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeContact || isSending) return;

    setIsSending(true);
    
    try {
      // Create new message
      const newMessage: InboxMessage = {
        id: Date.now().toString(),
        sender: 'me',
        message: replyMessage,
        timestamp: new Date().toISOString(),
        read: true,
        outgoing: true,
        recipient: activeContact.phoneNumber
      };

      // Update contact messages
      const updatedContact = {
        ...activeContact,
        messages: [...activeContact.messages, newMessage],
        lastMessage: newMessage,
        lastMessageTime: newMessage.timestamp
      };

      // Update contacts list
      setContacts(prev => prev.map(c => 
        c.id === activeContact.id ? updatedContact : c
      ));

      // Update active contact
      setActiveContact(updatedContact);
      
      // Clear reply message
      setReplyMessage('');
      
      // Scroll to bottom
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Agora';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[600px] flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {viewMode === 'contacts' ? 'Conversas' : activeContact?.displayName || 'Chat'}
          </h2>
          
          {viewMode === 'chat' && (
            <button
              onClick={handleBackToContacts}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Voltar
            </button>
          )}
        </div>

        {/* Search */}
        {viewMode === 'contacts' && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600 dark:text-red-400">
              <p>{error}</p>
            </div>
          </div>
        ) : viewMode === 'contacts' ? (
          // Contacts List
          <div className="h-full overflow-auto">
            {filteredContacts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
                </p>
              </div>
            ) : (
              <div>
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
                            {contact.displayName}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(contact.lastMessage.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                          {contact.lastMessage.message}
                        </p>
                      </div>
                      {contact.unreadCount > 0 && (
                        <div className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {contact.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Chat View
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4" ref={messagesContainerRef}>
              {activeContact?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.outgoing ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.outgoing
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.outgoing ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <form onSubmit={handleSendReply} className="flex space-x-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !replyMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSending ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CleanEnhancedInbox;