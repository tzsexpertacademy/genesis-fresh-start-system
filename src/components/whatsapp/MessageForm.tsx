import { useState, useEffect } from 'react';
import { sendTextMessage } from '../../services/whatsappService';
import { getContacts } from '../../services/contactService';
import { WhatsAppContact } from '../../types/whatsapp';
import ComponentCard from '../common/ComponentCard';

interface MessageFormProps {
  onMessageSent?: (result: any) => void;
  disabled?: boolean;
}

const MessageForm = ({ onMessageSent, disabled = false }: MessageFormProps) => {
  const [number, setNumber] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showContactDropdown, setShowContactDropdown] = useState<boolean>(false);

  // Fetch contacts on component mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const response = await getContacts();
        if (response.status && response.data?.contacts) {
          setContacts(response.data.contacts);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, []);

  // Handle contact selection
  const handleContactSelect = (contact: WhatsAppContact) => {
    setNumber(contact.phone_number);
    setShowContactDropdown(false);
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    contact.phone_number.includes(searchTerm)
  );

  // Validate phone number
  const validateNumber = (num: string) => {
    // Number should start with country code and contain only digits
    return /^\d+$/.test(num);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setError(null);
    setSuccess(null);

    // Validate inputs
    if (!number || !message) {
      setError('Phone number and message are required');
      return;
    }

    if (!validateNumber(number)) {
      setError('Invalid phone number format. Use country code without + (e.g., 62812345678)');
      return;
    }

    try {
      setLoading(true);
      const response = await sendTextMessage(number, message);

      if (response.status) {
        setSuccess('Message sent successfully!');

        // Store the actual message content before clearing it
        const sentMessageContent = message;

        // Clear message field
        setMessage('');

        // Pass both the response data and the actual message content
        if (onMessageSent) {
          onMessageSent({
            ...response.data,
            messageContent: sentMessageContent
          });
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title="Send WhatsApp Message"
      desc="Send a text message to any WhatsApp number"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 py-3 px-4 flex items-start dark:bg-red-500/10">
            <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg bg-green-50 py-3 px-4 flex items-start dark:bg-green-500/10">
            <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-green-600 dark:text-green-400">{success}</span>
          </div>
        )}

        {/* Contact Selector */}
        <div className="mb-5">
          <label className="mb-3 block text-gray-800 dark:text-white/90 font-medium flex items-center">
            <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            Select Contact
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts by name or number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowContactDropdown(true);
              }}
              onFocus={() => setShowContactDropdown(true)}
              disabled={disabled || loading || loadingContacts}
              className="w-full rounded-lg border border-gray-200 bg-transparent py-3 pl-4 pr-10 font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
            />
            <button
              type="button"
              onClick={() => setShowContactDropdown(!showContactDropdown)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            {showContactDropdown && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 max-h-60 overflow-y-auto">
                {loadingContacts ? (
                  <div className="py-4 px-3 text-center text-gray-500 dark:text-gray-400">
                    <svg className="animate-spin mx-auto h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="mt-2 block">Loading contacts...</span>
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleContactSelect(contact)}
                      className="w-full px-4 py-3 text-left transition hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary">
                          {contact.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium text-gray-900 dark:text-white">{contact.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">+{contact.phone_number}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-4 px-3 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No contacts found' : 'No contacts available'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-3 block text-gray-800 dark:text-white/90 font-medium flex items-center">
            <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
            Phone Number <span className="text-danger ml-1">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500 dark:text-gray-400">
              +
            </div>
            <input
              type="text"
              placeholder="62812345678"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              disabled={disabled || loading}
              className="w-full rounded-lg border border-gray-200 bg-transparent py-3 pl-8 pr-5 font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Include country code without + (e.g., 62 for Indonesia)
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-3 block text-gray-800 dark:text-white/90 font-medium flex items-center">
            <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            Message <span className="text-danger ml-1">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled || loading}
            className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
          ></textarea>
          <div className="flex justify-end mt-2">
            <span className={`text-xs ${message.length > 1000 ? 'text-danger' : 'text-gray-500'}`}>
              {message.length}/1000 characters
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || loading || !number || !message}
          className="flex w-full justify-center items-center rounded-lg bg-brand-500 py-3 px-6 font-medium text-white transition hover:bg-brand-600 disabled:bg-opacity-70 disabled:cursor-not-allowed dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
              Send Message
            </>
          )}
        </button>
      </form>
    </ComponentCard>
  );
};

export default MessageForm;
