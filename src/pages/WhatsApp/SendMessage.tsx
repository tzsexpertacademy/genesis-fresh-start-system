import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageForm from '../../components/whatsapp/MessageForm';
import { getConnectionStatus } from '../../services/whatsappService';
import ComponentCard from '../../components/common/ComponentCard';
import PageMeta from '../../components/common/PageMeta';

interface MessageHistory {
  id: string;
  to: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'failed';
}

const SendMessage = () => {
  const [status, setStatus] = useState<string>('disconnected');
  // Initialize history from localStorage or empty array
  const [history, setHistory] = useState<MessageHistory[]>(() => {
    const savedHistory = localStorage.getItem('whatsapp_message_history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const navigate = useNavigate();

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
    localStorage.setItem('whatsapp_message_history', JSON.stringify(history));
  }, [history]);

  // Handle message sent
  const handleMessageSent = (result: any) => {
    console.log('Message sent, adding to history:', result);

    const newMessage: MessageHistory = {
      id: result.messageId,
      to: result.to,
      message: result.messageContent || 'Message sent successfully',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    // Update history state with the new message
    setHistory(prevHistory => {
      const updatedHistory = [newMessage, ...prevHistory];
      console.log('Updated history:', updatedHistory);
      return updatedHistory;
    });
  };

  return (
    <>
      <PageMeta
        title="Send WhatsApp Message | TailAdmin - React.js Admin Dashboard Template"
        description="Send messages to WhatsApp contacts"
      />
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Send WhatsApp Message
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <MessageForm
              onMessageSent={handleMessageSent}
              disabled={status !== 'connected'}
            />

            {status !== 'connected' && (
              <div className="mt-4 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 p-4">
                <h5 className="mb-2 font-medium text-yellow-600 dark:text-yellow-400">WhatsApp Not Connected</h5>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  You need to connect to WhatsApp before sending messages.
                </p>
                <button
                  onClick={() => navigate('/whatsapp/login')}
                  className="mt-2 inline-flex items-center justify-center rounded-md border border-yellow-500 bg-yellow-500 py-2 px-4 text-center font-medium text-white hover:bg-yellow-600 transition-colors"
                >
                  Go to Login Page
                </button>
              </div>
            )}
          </div>

          <ComponentCard
            title="Message History"
            desc="Your recently sent messages"
          >
              {history.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                  </svg>
                  <p className="font-medium text-lg text-gray-700 dark:text-gray-300">No messages sent yet</p>
                  <p className="text-sm mt-2 max-w-xs text-gray-500 dark:text-gray-400">
                    Your sent messages will appear here. Try sending a message using the form.
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                          <span className="font-medium text-gray-800 dark:text-gray-200">To: <span className="text-brand-500">+{item.to}</span></span>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full py-1 px-3 text-xs font-medium ${
                            item.status === 'sent'
                              ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                            item.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                          {item.status === 'sent' ? 'Sent' : 'Failed'}
                        </span>
                      </div>
                      <div className="pl-11">
                        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] p-3 rounded-lg">{item.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {history.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('whatsapp_message_history');
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
          </ComponentCard>
        </div>
      </div>
    </>
  );
};

export default SendMessage;
