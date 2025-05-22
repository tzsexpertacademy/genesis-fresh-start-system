import React, { useState, useEffect, useRef, memo } from 'react';
import ComponentCard from '../../components/common/ComponentCard';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { getGroqConfig, generateGroqResponse } from '../../services/groqService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Constants for cache management
const GROQ_HISTORY_CACHE_KEY = 'groq_chat_history';
const GROQ_CACHE_TIMESTAMP_KEY = 'groq_cache_timestamp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const GroqChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeySet, setApiKeySet] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to check if cache is valid (less than 24 hours old)
  const isCacheValid = () => {
    const timestamp = localStorage.getItem(GROQ_CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    const cacheTime = parseInt(timestamp, 10);
    return Date.now() - cacheTime < ONE_DAY_MS;
  };

  // Helper function to save cache with timestamp
  const saveToCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(GROQ_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error(`Error saving Groq chat to cache (${key}):`, error);
    }
  };

  // Helper function to load from cache
  const loadFromCache = (key: string) => {
    try {
      if (isCacheValid()) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error(`Error loading Groq chat from cache (${key}):`, error);
      return null;
    }
  };

  // Helper function to clear expired cache
  const clearExpiredCache = () => {
    if (!isCacheValid()) {
      localStorage.removeItem(GROQ_HISTORY_CACHE_KEY);
      // Keep GROQ_CACHE_TIMESTAMP_KEY to mark when it was last cleared or set
      console.log('Cleared expired Groq chat history cache');
    }
  };

  useEffect(() => {
    clearExpiredCache(); // Clear expired cache on load
    const cachedMessages = loadFromCache(GROQ_HISTORY_CACHE_KEY);
    if (cachedMessages) {
      setMessages(cachedMessages);
    }

    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const response = await getGroqConfig();
        if (response?.status && response.data?.config) {
          setApiKeySet(response.data.config.apiKeySet);
          setModelName(response.data.config.model);
          if (!response.data.config.apiKeySet) {
            setError("Groq API Key not set in backend .env file.");
          }
        } else {
          setError(response.message || "Failed to load Groq configuration.");
        }
      } catch (err) {
        console.error('Error loading Groq configuration:', err);
        setError("Error loading Groq configuration.");
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (messages.length > 0) {
      saveToCache(GROQ_HISTORY_CACHE_KEY, messages);
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (error) setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(GROQ_HISTORY_CACHE_KEY);
    // Update timestamp to reflect cache clear
    localStorage.setItem(GROQ_CACHE_TIMESTAMP_KEY, Date.now().toString());
    if (inputRef.current) inputRef.current.focus();
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !apiKeySet) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const currentHistory = [...messages, userMessage].slice(-10); 
      const response = await generateGroqResponse(userMessage.content, currentHistory);

      if (response.status && response.data) {
        const assistantMessage: Message = { role: 'assistant', content: response.data.response };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = { role: 'assistant', content: response.message || "Failed to get response." };
        setMessages(prev => [...prev, errorMessage]);
        setError(response.message || "Failed to get response.");
      }
    } catch (err: any) {
      console.error('Error generating Groq response:', err);
      const errorMessageContent = err.message || "An unexpected error occurred.";
      const errorMessage: Message = { role: 'assistant', content: errorMessageContent };
      setMessages(prev => [...prev, errorMessage]);
      setError(errorMessageContent);
    } finally {
      setSending(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };
  
  const styles = {
    chatContainer: {
      height: '700px',
      display: 'flex',
      flexDirection: 'column' as 'column'
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto' as 'auto',
      padding: '1rem',
      scrollBehavior: 'smooth' as 'smooth'
    },
    inputArea: {
      borderTop: '1px solid var(--border-color, #e5e7eb)',
      padding: '1rem'
    },
    textarea: {
      resize: 'none' as 'none',
      minHeight: '44px',
      maxHeight: '120px',
      width: '100%',
      overflowY: 'auto' as 'auto',
      fontFamily: 'inherit'
    }
  };

  return (
    <div className="max-w-1536px mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-md2 font-bold text-black dark:text-white">Groq Chat ({modelName})</h2>
        {messages.length > 0 && (
            <button
              onClick={clearChat}
              type="button"
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Clear Chat
            </button>
          )}
      </div>
      <ComponentCard title="Chat with Groq">
        {loadingConfig ? (
          <div className="p-6 text-center">Loading Groq Configuration...</div>
        ) : !apiKeySet ? (
          <div className="p-6 text-center text-red-500">
            Groq API Key not configured in the backend. Please set GROQ_API_KEY in the .env file.
          </div>
        ) : (
          <div style={styles.chatContainer}>
            <div style={styles.messagesArea}>
              {messages.map((msg, index) => (
                <div key={index} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90'}`}>
                    <div className="markdown-content text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {error && <div className="p-4 text-red-500 text-sm">{error}</div>}
            <div style={styles.inputArea}>
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Send a message to Groq..."
                  className="w-full px-4 py-3 pr-12 text-sm text-gray-600 dark:text-gray-300 bg-transparent focus:outline-none resize-none"
                  style={{...styles.textarea, height: Math.min(120, Math.max(44, input.split('\n').length * 22)) + 'px'}}
                  disabled={sending || !apiKeySet}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !input.trim() || !apiKeySet}
                  className="absolute right-2 bottom-2 p-2 text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors duration-200"
                  title="Send message"
                >
                  {sending ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
  );
};

const GroqChatWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <GroqChat />
  </ErrorBoundary>
);

export default memo(GroqChatWithErrorBoundary);