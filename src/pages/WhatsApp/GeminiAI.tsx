import React, { useState, useEffect, useRef, memo } from 'react';
import ComponentCard from '../../components/common/ComponentCard';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { getGeminiConfig, generateResponse, updateGeminiConfig } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

// Constants for cache management
const HISTORY_CACHE_KEY = 'gemini_chat_history';
const PROMPT_CACHE_KEY = 'gemini_system_prompt';
const CACHE_TIMESTAMP_KEY = 'gemini_cache_timestamp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Message interface
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Clean implementation of GeminiAI without any document.body manipulations
const GeminiAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to check if cache is valid (less than 24 hours old)
  const isCacheValid = () => {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;

    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();

    return now - cacheTime < ONE_DAY_MS;
  };

  // Helper function to save cache with timestamp
  const saveToCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error(`Error saving to cache (${key}):`, error);
    }
  };

  // Helper function to load from cache
  const loadFromCache = (key: string) => {
    try {
      // Only load if cache is valid (less than 24 hours old)
      if (isCacheValid()) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error(`Error loading from cache (${key}):`, error);
      return null;
    }
  };

  // Helper function to clear expired cache
  const clearExpiredCache = () => {
    if (!isCacheValid()) {
      localStorage.removeItem(HISTORY_CACHE_KEY);
      localStorage.removeItem(PROMPT_CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      console.log('Cleared expired cache (older than 24 hours)');
    }
  };

  // Load settings on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);

        // Clear expired cache first
        clearExpiredCache();

        const response = await getGeminiConfig();
        if (response?.status && response.data?.config) {
          // Only update if the response contains valid data
          setEnabled(response.data.config.enabled);

          // Store in localStorage for persistence
          localStorage.setItem('gemini_enabled_state', response.data.config.enabled.toString());

          // Save system prompt to cache
          if (response.data.config.instructions) {
            localStorage.setItem(PROMPT_CACHE_KEY, response.data.config.instructions);
          }
        } else {
          // Fallback to localStorage if API fails
          const cachedState = localStorage.getItem('gemini_enabled_state');
          setEnabled(cachedState === 'true');
        }
      } catch (error) {
        console.error('Error loading Gemini configuration:', error);

        // Fallback to localStorage if API fails
        const cachedState = localStorage.getItem('gemini_enabled_state');
        setEnabled(cachedState === 'true');
      } finally {
        setLoading(false);
      }
    };

    // Load messages from cache
    const cachedMessages = loadFromCache(HISTORY_CACHE_KEY);
    if (cachedMessages) {
      console.log('Loaded chat history from cache');
      setMessages(cachedMessages);
    }

    loadConfig();
  }, []);

  // Scroll to bottom when messages change and save to cache
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Save messages to cache with timestamp
    if (messages.length > 0) {
      saveToCache(HISTORY_CACHE_KEY, messages);
      console.log('Saved chat history to cache with timestamp');
    }
  }, [messages]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Clear any error when user starts typing
    if (error) setError(null);
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat history
  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(HISTORY_CACHE_KEY);

    // Keep the timestamp to track when cache was last cleared
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

    console.log('Cleared chat history cache');

    // Focus on input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Send message
  const sendMessage = async () => {
    // Validate input and state
    if (!input.trim() || sending || !enabled) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    // Update UI immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setSending(true);

    try {
      // Use the current messages array for history (including the new user message)
      // This ensures we maintain the full conversation context
      const currentMessages = [...messages, userMessage];

      // Call API with the current messages as history
      const response = await generateResponse(userMessage.content, currentMessages);

      if (response.status) {
        // Add assistant message
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.response
        };

        // Update messages with the assistant's response
        setMessages([...currentMessages, assistantMessage]);

        // Save the updated conversation to cache immediately
        saveToCache(HISTORY_CACHE_KEY, [...currentMessages, assistantMessage]);
        console.log('Updated and saved conversation history with new messages');
      } else {
        // Show error but still display a message from the assistant
        const errorMessage: Message = {
          role: 'assistant',
          content: response.data?.response ||
            "Maaf, saya mengalami kesalahan saat memproses permintaan Anda. Silakan coba lagi."
        };

        // Update messages with the error response
        setMessages([...currentMessages, errorMessage]);

        // Save the updated conversation to cache
        saveToCache(HISTORY_CACHE_KEY, [...currentMessages, errorMessage]);

        if (!response.data?.response) {
          setError(response.message || 'Gagal menghasilkan respons');
        }
      }
    } catch (error: any) {
      console.error('Error generating response:', error);
      setError(error.message || 'Gagal menghasilkan respons');

      // Add an error message to the conversation
      const errorMessage: Message = {
        role: 'assistant',
        content: "Maaf, terjadi kesalahan teknis. Silakan coba lagi dalam beberapa saat."
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);

      // Scroll to bottom after a slight delay to ensure DOM update
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Toggle enabled state
  const toggleEnabled = async () => {
    try {
      const newState = !enabled;
      const response = await updateGeminiConfig({ enabled: newState });

      if (response.status) {
        setEnabled(newState);
        localStorage.setItem('gemini_enabled_state', newState.toString());
      }
    } catch (error) {
      console.error('Error updating Gemini enabled state:', error);
    }
  };

  // Group messages by sender
  const groupedMessages = messages.reduce((groups: any[], message, index, array) => {
    const startNewGroup = index === 0 || array[index - 1].role !== message.role;

    if (startNewGroup) {
      groups.push({
        role: message.role,
        messages: [message]
      });
    } else {
      groups[groups.length - 1].messages.push(message);
    }

    return groups;
  }, []);

  // Component styles
  const styles = {
    container: {
      maxWidth: '1536px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '1.5rem'
    },
    chatContainer: {
      height: '700px', // Increased height for better experience
      display: 'flex',
      flexDirection: 'column' as 'column'
    },
    messagesArea: {
      flex: 1,
      overflow: 'auto',
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
      overflow: 'auto',
      fontFamily: 'inherit'
    },
    loadingSpinner: {
      width: '2rem',
      height: '2rem',
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      animation: 'spin 1s linear infinite'
    }
  };

  // Add CSS for markdown styling
  useEffect(() => {
    // Add custom CSS for markdown content
    const style = document.createElement('style');
    style.innerHTML = `
      .markdown-content h1, .markdown-content h2, .markdown-content h3,
      .markdown-content h4, .markdown-content h5, .markdown-content h6 {
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
      }
      .markdown-content p {
        margin-bottom: 0.75rem;
      }
      .markdown-content ul, .markdown-content ol {
        margin-bottom: 0.75rem;
        padding-left: 1.5rem;
      }
      .markdown-content ul {
        list-style-type: disc;
      }
      .markdown-content ol {
        list-style-type: decimal;
      }
      .markdown-content a {
        color: #3b82f6;
        text-decoration: underline;
      }
      .markdown-content blockquote {
        border-left: 4px solid #e5e7eb;
        padding-left: 1rem;
        margin-left: 0;
        margin-right: 0;
        font-style: italic;
      }
      .markdown-content pre {
        margin-bottom: 0.75rem;
        white-space: pre-wrap;
        overflow-x: auto;
      }
      .markdown-content code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .markdown-content table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 0.75rem;
      }
      .markdown-content img {
        max-width: 100%;
        height: auto;
      }
      .dark .markdown-content a {
        color: #60a5fa;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-title-md2 font-bold text-black dark:text-white">
            Gemini AI Chat
          </h2>

        </div>

        <div className="flex gap-2">
          {enabled && (
            <button
              onClick={toggleEnabled}
              type="button"
              className={`px-3 py-1.5 text-sm font-medium text-white ${enabled ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${enabled ? 'focus:ring-yellow-500' : 'focus:ring-green-500'}`}
            >
              {enabled ? 'Disable AI' : 'Enable AI'}
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              type="button"
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Clear Chat
            </button>
          )}

          <Link
            to="/whatsapp/gemini-settings"
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Content Grid - Full width chat panel */}
      <div className="grid grid-cols-1 gap-8">
        {/* Chat Panel */}
        <div className="w-full">
          <ComponentCard title="Chat">
            {loading ? (
              <div className="p-6 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
              </div>
            ) : !enabled ? (
              <div className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Enable Gemini AI in the settings panel to start chatting.
                </p>
                <button
                  onClick={toggleEnabled}
                  className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  Enable Gemini
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-[500px] md:h-[600px] lg:h-[700px]" style={styles.chatContainer}>
                {/* Messages Area */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-2 md:p-4 space-y-6"
                  style={styles.messagesArea}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-md mx-auto">
                        <div className="mb-5">
                          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-medium text-gray-800 dark:text-white/90 mb-2">
                          Gemini AI Assistant
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Mulai percakapan dengan Gemini AI. Asisten ini dapat membantu Anda dengan berbagai pertanyaan dan tugas.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                          {[
                            "Jelaskan konsep machine learning",
                            "Buatkan contoh kode React",
                            "Ceritakan tentang Manchester United",
                            "Bagaimana cara membuat kue brownies?"
                          ].map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setInput(suggestion);
                                inputRef.current?.focus();
                              }}
                              className="p-3 text-sm text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 w-full max-w-3xl mx-auto">
                      {groupedMessages.map((group, groupIndex) => {
                        return (
                          <div key={groupIndex} className="message-group">
                            {/* Avatar and name for assistant messages */}
                            {group.role === 'assistant' && (
                              <div className="flex items-center mb-2">
                                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium mr-2 shadow-sm">
                                  AI
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gemini AI</span>
                              </div>
                            )}

                            {/* Avatar and name for user messages */}
                            {group.role === 'user' && (
                              <div className="flex items-center justify-end mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">You</span>
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-medium shadow-sm">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}

                            {/* Messages in this group */}
                            <div className="flex flex-col w-full">
                              {group.messages.map((message: Message, msgIndex: number) => {
                                return (
                                  <div
                                    key={`${groupIndex}-${msgIndex}`}
                                    className={`${message.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[95%] md:max-w-[85%] mb-2`}
                                  >
                                    <div className={`rounded-2xl px-4 py-3 ${
                                      message.role === 'user'
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90'
                                    }`}>
                                      {message.role === 'user' ? (
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                      ) : (
                                        <div className="markdown-content text-sm">
                                          <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                              // Style code blocks
                                              code: ({node, inline, className, children, ...props}) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !inline ? (
                                                  <div className="code-block-wrapper my-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                    <div className="code-header bg-gray-100 dark:bg-gray-700 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 flex justify-between items-center border-b border-gray-200 dark:border-gray-600">
                                                      <span className="font-mono font-medium">{match?.[1] || 'code'}</span>
                                                      <button
                                                        onClick={() => {
                                                          navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                                                        }}
                                                        className="text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 px-2 py-1 rounded transition-colors"
                                                      >
                                                        Copy
                                                      </button>
                                                    </div>
                                                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 overflow-x-auto text-gray-800 dark:text-gray-200">
                                                      <code className={match ? `language-${match[1]}` : ''}>
                                                        {children}
                                                      </code>
                                                    </pre>
                                                  </div>
                                                ) : (
                                                  <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-sm">
                                                    {children}
                                                  </code>
                                                )
                                              },
                                              // Style tables
                                              table: ({children}) => (
                                                <div className="overflow-x-auto my-4">
                                                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700">
                                                    {children}
                                                  </table>
                                                </div>
                                              ),
                                              thead: ({children}) => (
                                                <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
                                              ),
                                              th: ({children}) => (
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-700 last:border-r-0">{children}</th>
                                              ),
                                              td: ({children}) => (
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-700 last:border-r-0">{children}</td>
                                              ),
                                              // Style links
                                              a: ({href, children}) => (
                                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                  {children}
                                                </a>
                                              ),
                                              // Style lists
                                              ul: ({children}) => (
                                                <ul className="list-disc pl-5 my-2">{children}</ul>
                                              ),
                                              ol: ({children}) => (
                                                <ol className="list-decimal pl-5 my-2">{children}</ol>
                                              ),
                                              // Style headings
                                              h1: ({children}) => (
                                                <h1 className="text-xl font-bold my-3">{children}</h1>
                                              ),
                                              h2: ({children}) => (
                                                <h2 className="text-lg font-bold my-2">{children}</h2>
                                              ),
                                              h3: ({children}) => (
                                                <h3 className="text-md font-bold my-2">{children}</h3>
                                              ),
                                              // Style paragraphs
                                              p: ({children}) => (
                                                <p className="my-2">{children}</p>
                                              ),
                                            }}
                                          >
                                            {message.content}
                                          </ReactMarkdown>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Timestamp */}
                              <div className="text-xs text-gray-400 mt-1 px-1">
                                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Typing indicator */}
                      {sending && (
                        <div className="w-full max-w-3xl mx-auto">
                          <div className="flex items-center mb-2">
                            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium mr-2 shadow-sm">
                              AI
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gemini AI</span>
                          </div>
                          <div className="mr-auto max-w-[95%] md:max-w-[85%] mb-2">
                            <div className="rounded-2xl px-4 py-3 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
                              <div className="flex space-x-3 items-center h-6">
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error message */}
                      {error && (
                        <div className="w-full max-w-3xl mx-auto mt-4">
                          <div className="mx-auto max-w-[95%] md:max-w-[85%] rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm">{error}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invisible element for scrolling to bottom */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-2 md:p-4" style={styles.inputArea}>
                  <div className="max-w-3xl mx-auto">
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="Kirim pesan ke Gemini AI..."
                        className="w-full px-4 py-3 pr-12 text-sm text-gray-600 dark:text-gray-300 bg-transparent focus:outline-none resize-none"
                        style={{
                          ...styles.textarea,
                          height: Math.min(120, Math.max(44, input.split('\n').length * 22)) + 'px'
                        }}
                        disabled={sending}
                      />

                      {/* Send button */}
                      <button
                        type="button"
                        onClick={sendMessage}
                        disabled={sending || !input.trim()}
                        className="absolute right-2 bottom-2 p-2 text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors duration-200"
                        title="Kirim pesan"
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

                    <div className="mt-2 flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-1 md:space-y-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 w-full md:w-auto">
                        Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 w-full md:w-auto">
                        Gemini AI akan mengingat konteks percakapan Anda
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ComponentCard>
        </div>
      </div>
    </div>
  );
};

// Wrap with ErrorBoundary and memo for performance
const GeminiAIWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <GeminiAI />
  </ErrorBoundary>
);

export default memo(GeminiAIWithErrorBoundary);
