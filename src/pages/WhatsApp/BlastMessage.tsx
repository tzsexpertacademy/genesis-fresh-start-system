import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendTextMessage } from '../../services/whatsappService';
import { getContacts, getContactCategories } from '../../services/contactService';
import { getConnectionStatus } from '../../services/whatsappService';
import { WhatsAppContact, WhatsAppContactCategory } from '../../types/whatsapp';
import ComponentCard from '../../components/common/ComponentCard';
import PageMeta from '../../components/common/PageMeta';

interface BlastMessageHistory {
  id: string;
  contacts: Array<{
    id: string;
    name: string;
    phone_number: string;
  }>;
  totalRecipients: number;
  message: string;
  timestamp: string;
  successCount: number;
  failedCount: number;
  intervalType?: string;
  intervalValue?: number;
}

// Enum for interval types
enum IntervalType {
  SECOND = 'seconds',
  MINUTE = 'minutes',
  HOUR = 'hours'
}

const BlastMessage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('disconnected');
  const [categories, setCategories] = useState<WhatsAppContactCategory[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<WhatsAppContact[]>([]);
  const [manualNumbers, setManualNumbers] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [intervalType, setIntervalType] = useState<IntervalType>(IntervalType.SECOND);
  const [intervalValue, setIntervalValue] = useState<number>(2);
  const [sendingProgress, setSendingProgress] = useState<{current: number, total: number} | null>(null);
  const [history, setHistory] = useState<BlastMessageHistory[]>(() => {
    const savedHistory = localStorage.getItem('whatsapp_blast_history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // Check connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await getConnectionStatus();
        if (response.status) {
          setStatus(response.data.status);

          // Redirect to login page if disconnected
          if (response.data.status === 'disconnected') {
            navigate('/whatsapp/login');
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkStatus();

    // Check status periodically
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('whatsapp_blast_history', JSON.stringify(history));
  }, [history]);

  // Fetch categories and contacts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingCategories(true);
        setLoadingContacts(true);

        const [categoriesRes, contactsRes] = await Promise.all([
          getContactCategories(),
          getContacts()
        ]);

        if (categoriesRes.status && categoriesRes.data?.categories) {
          setCategories(categoriesRes.data.categories);
        }

        if (contactsRes.status && contactsRes.data?.contacts) {
          setContacts(contactsRes.data.contacts);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load categories or contacts');
      } finally {
        setLoadingCategories(false);
        setLoadingContacts(false);
      }
    };

    fetchData();
  }, []);

  // Update selected contacts when categories change
  useEffect(() => {
    if (selectedCategories.length === 0) {
      setSelectedContacts([]);
      return;
    }

    const filteredContacts = contacts.filter(contact => 
      contact.categories && 
      contact.categories.some(cat => selectedCategories.includes(cat.id))
    );

    setSelectedContacts(filteredContacts);
  }, [selectedCategories, contacts]);

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Parse manual numbers
  const getManualNumbersArray = (): string[] => {
    if (!manualNumbers.trim()) return [];

    // Split by commas, newlines, or spaces and filter out empty strings
    return manualNumbers
      .split(/[,\n\s]+/)
      .map(num => num.trim())
      .filter(num => /^\d+$/.test(num)); // Keep only valid number formats
  };

  // Calculate total recipients
  const totalRecipients = selectedContacts.length + getManualNumbersArray().length;

  // Calculate delay in milliseconds based on interval type and value
  const calculateDelay = (): number => {
    switch (intervalType) {
      case IntervalType.SECOND:
        return intervalValue * 1000;
      case IntervalType.MINUTE:
        return intervalValue * 60 * 1000;
      case IntervalType.HOUR:
        return intervalValue * 60 * 60 * 1000;
      default:
        return 2000; // 2 seconds default
    }
  };

  // Handle blast submission
  const handleSendBlast = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset status messages
    setError(null);
    setSuccess(null);
    setSendingProgress(null);

    // Validate inputs
    if (totalRecipients === 0) {
      setError('Please select at least one contact or enter a phone number');
      return;
    }

    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    // Create a list of all recipients
    const allRecipients = [
      ...selectedContacts,
      ...getManualNumbersArray().map(num => ({
        id: `manual-${num}`,
        name: `+${num}`,
        phone_number: num
      }))
    ];

    try {
      setLoading(true);
      
      const results = [];
      let successCount = 0;
      let failedCount = 0;
      const delay = calculateDelay();

      // Send messages sequentially with configurable delay
      for (let i = 0; i < allRecipients.length; i++) {
        const recipient = allRecipients[i];
        
        // Update progress
        setSendingProgress({
          current: i + 1,
          total: allRecipients.length
        });

        try {
          const response = await sendTextMessage(recipient.phone_number, message);
          if (response.status) {
            successCount++;
            results.push({
              recipient: recipient.phone_number,
              name: recipient.name,
              success: true,
              messageId: response.data.messageId
            });
          } else {
            failedCount++;
            results.push({
              recipient: recipient.phone_number,
              name: recipient.name,
              success: false,
              error: response.message
            });
          }
        } catch (error: any) {
          console.error(`Error sending message to ${recipient.phone_number}:`, error);
          failedCount++;
          results.push({
            recipient: recipient.phone_number,
            name: recipient.name,
            success: false,
            error: error.message || 'Failed to send message'
          });
        }
        
        // Add delay between messages, but not after the last one
        if (i < allRecipients.length - 1) {
          await new Promise(r => setTimeout(r, delay));
        }
      }

      // Add to history
      const historyEntry: BlastMessageHistory = {
        id: `blast-${Date.now()}`,
        contacts: allRecipients.map(r => ({
          id: r.id,
          name: r.name,
          phone_number: r.phone_number
        })),
        totalRecipients: allRecipients.length,
        message: message,
        timestamp: new Date().toISOString(),
        successCount,
        failedCount,
        intervalType,
        intervalValue
      };

      setHistory(prev => [historyEntry, ...prev]);

      // Show success message with interval information
      const intervalTypeText = intervalType === IntervalType.SECOND ? 'seconds' : intervalType === IntervalType.MINUTE ? 'minutes' : 'hours';
      setSuccess(`Message sent to ${successCount} recipients successfully with ${intervalValue} ${intervalTypeText} interval. ${failedCount} failed.`);
      
      // Clear message field
      setMessage('');
    } catch (error: any) {
      console.error('Error sending blast:', error);
      setError(error.message || 'Failed to send messages. Please try again.');
    } finally {
      setLoading(false);
      setSendingProgress(null);
    }
  };

  return (
    <>
      <PageMeta
        title="WhatsApp Blast Message"
        description="Send WhatsApp messages to multiple contacts at once"
      />
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            WhatsApp Blast Message
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <ComponentCard
              title="Send Blast Message"
              desc="Send a message to multiple WhatsApp contacts at once"
            >
              <form onSubmit={handleSendBlast}>
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

                {/* Categories Section */}
                <div className="mb-5">
                  <label className="mb-3 block text-gray-800 dark:text-white/90 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    Select Categories
                  </label>
                
                  {loadingCategories ? (
                    <div className="py-4 px-3 text-center text-gray-500 dark:text-gray-400">
                      <svg className="animate-spin mx-auto h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="mt-2 block">Loading categories...</span>
                    </div>
                  ) : categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleCategoryChange(category.id)}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:focus:ring-primary"
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="flex items-center text-sm font-medium text-black dark:text-white"
                          >
                            <span
                              className="mr-1.5 inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></span>
                            {category.name} ({category.contact_count || 0})
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 px-3 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      <span>No categories available. <a href="/whatsapp/categories" className="text-primary hover:underline">Create categories</a> to organize your contacts.</span>
                    </div>
                  )}
                </div>

                {/* Manual Numbers Section */}
                <div className="mb-5">
                  <label className="mb-3 block text-gray-800 dark:text-white/90 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                    Add Numbers Manually (Optional)
                  </label>
                  <div>
                    <textarea
                      rows={3}
                      placeholder="Enter phone numbers with country code, separated by commas or new lines (e.g., 62812345678, 6287654321)"
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                      disabled={loading || status !== 'connected'}
                      className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                    ></textarea>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Include country code without + (e.g., 62 for Indonesia)
                  </p>
                </div>

                {/* Recipients Preview Section */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-gray-800 dark:text-white/90 font-medium flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                      </svg>
                      Selected Recipients
                    </label>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Total: <span className="font-medium text-primary">{totalRecipients}</span>
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-3">
                    {totalRecipients === 0 ? (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        <span>No recipients selected. Please select categories or enter numbers manually.</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Selected contacts preview */}
                        {selectedContacts.map(contact => (
                          <div key={contact.id} className="flex items-center text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{contact.name}</span>
                            <span className="ml-2 text-gray-500 dark:text-gray-400">+{contact.phone_number}</span>
                          </div>
                        ))}
                        
                        {/* Manual numbers preview */}
                        {getManualNumbersArray().map((number, index) => (
                          <div key={`manual-${index}`} className="flex items-center text-sm">
                            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">Manual Entry</span>
                            <span className="ml-2 text-gray-500 dark:text-gray-400">+{number}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Section */}
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
                    disabled={loading || status !== 'connected'}
                    className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                  ></textarea>
                  <div className="flex justify-end mt-2">
                    <span className={`text-xs ${message.length > 1000 ? 'text-danger' : 'text-gray-500'}`}>
                      {message.length}/1000 characters
                    </span>
                  </div>
                </div>

                {/* Interval Settings Section */}
                <div className="mb-5">
                  <label className="mb-3 block text-gray-800 dark:text-white/90 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Sending Interval
                  </label>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1"
                        value={intervalValue}
                        onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={loading}
                        className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                      />
                    </div>
                    <div className="flex-1">
                      <select
                        value={intervalType}
                        onChange={(e) => setIntervalType(e.target.value as IntervalType)}
                        disabled={loading}
                        className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                      >
                        <option value={IntervalType.SECOND}>Seconds</option>
                        <option value={IntervalType.MINUTE}>Minutes</option>
                        <option value={IntervalType.HOUR}>Hours</option>
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Set the interval between sending each message to avoid rate limits
                  </p>
                </div>

                {sendingProgress && (
                  <div className="mb-5">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
                      <div 
                        className="bg-brand-500 h-2.5 rounded-full" 
                        style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Sending message {sendingProgress.current} of {sendingProgress.total}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || status !== 'connected' || totalRecipients === 0 || !message.trim()}
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
                      Send Blast Message
                    </>
                  )}
                </button>

                {status !== 'connected' && (
                  <div className="mt-4 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 p-4">
                    <h5 className="mb-2 font-medium text-yellow-600 dark:text-yellow-400">WhatsApp Not Connected</h5>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      You need to connect to WhatsApp before sending messages.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/whatsapp/login')}
                      className="mt-2 inline-flex items-center justify-center rounded-md border border-yellow-500 bg-yellow-500 py-2 px-4 text-center font-medium text-white hover:bg-yellow-600 transition-colors"
                    >
                      Go to Login Page
                    </button>
                  </div>
                )}
              </form>
            </ComponentCard>
          </div>

          <ComponentCard
            title="Blast Message History"
            desc="Your recent blast messages"
          >
            {history.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex flex-col items-center">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                <p className="font-medium text-lg text-gray-700 dark:text-gray-300">No blast messages sent yet</p>
                <p className="text-sm mt-2 max-w-xs text-gray-500 dark:text-gray-400">
                  Your sent blast messages will appear here. Try sending a message using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          To: <span className="text-brand-500">{item.totalRecipients} recipients</span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex items-center rounded-full py-1 px-2 text-xs font-medium bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 mr-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                          {item.successCount} Sent
                        </span>
                        {item.failedCount > 0 && (
                          <span className="inline-flex items-center rounded-full py-1 px-2 text-xs font-medium bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></span>
                            {item.failedCount} Failed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pl-11">
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] p-3 rounded-lg">{item.message}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                          {item.intervalValue && item.intervalType && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              Interval: {item.intervalValue} {item.intervalType}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-xs text-primary hover:text-primary-dark flex items-center"
                          onClick={() => {
                            const element = document.getElementById(`recipients-${item.id}`);
                            if (element) {
                              element.classList.toggle('hidden');
                            }
                          }}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                          Show Recipients
                        </button>
                      </div>
                      <div id={`recipients-${item.id}`} className="hidden mt-2 max-h-32 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-2">
                        <div className="grid grid-cols-2 gap-1">
                          {item.contacts.map((contact, index) => (
                            <div key={index} className="text-xs text-gray-600 dark:text-gray-300 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1"></span>
                              <span className="truncate">{contact.name}: +{contact.phone_number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {history.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => {
                        setHistory([]);
                        localStorage.removeItem('whatsapp_blast_history');
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      Clear History
                    </button>
                  </div>
                )}
              </div>
            )}
          </ComponentCard>
        </div>
      </div>
    </>
  );
};

export default BlastMessage;