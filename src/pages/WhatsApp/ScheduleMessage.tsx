import React, { useState, useEffect, useRef } from 'react';
import PageMeta from '../../components/common/PageMeta';
import ComponentCard from '../../components/common/ComponentCard';
import { ScheduledMessage } from '../../types/whatsapp';
import { getScheduledMessages, scheduleMessage, deleteScheduledMessage } from '../../services/scheduleService';
import { getConnectionStatus } from '../../services/whatsappService';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, TrashBinIcon } from '../../icons';

const ScheduleMessage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('disconnected');
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [number, setNumber] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await getConnectionStatus();
        if (response.status) {
          setStatus(response.data);
          if (response.data === 'disconnected') {
            navigate('/whatsapp/login');
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Fetch scheduled messages
  const fetchScheduledMessages = async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    // setError(null); // Don't clear error on background refresh, only on explicit actions
    try {
      const response = await getScheduledMessages();
      if (response.status && response.data?.messages) {
        const sortedMessages = response.data.messages.sort((a, b) =>
          new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime()
        );
        setScheduledMessages(sortedMessages);
      } else {
        if (isInitialLoad) setError(response.message || 'Failed to load scheduled messages');
        console.warn("Failed to refresh scheduled messages in background:", response.message);
      }
    } catch (err) {
      if (isInitialLoad) setError(err instanceof Error ? err.message : 'An error occurred');
      console.error("Error fetching scheduled messages in background:", err);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledMessages(true); // Initial load

    // Clear any existing interval before setting a new one
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    // Set up polling for status updates
    pollingIntervalRef.current = setInterval(() => {
      console.log("Polling for scheduled messages updates...");
      fetchScheduledMessages(false); // Background refresh
    }, 30000); // Poll every 30 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Handle scheduling a message
  const handleScheduleMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!number.trim() || !message.trim() || !scheduleDate || !scheduleTime) {
      setError('All fields are required');
      return;
    }

    const localDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(localDateTime.getTime())) {
        setError('Invalid date or time format selected.');
        return;
    }
    const isoScheduleDateTime = localDateTime.toISOString();
    
    const scheduledDateObj = new Date(isoScheduleDateTime);
    if (scheduledDateObj <= new Date()) {
        setError('Scheduled time must be in the future');
        return;
    }

    try {
      setScheduling(true);
      const response = await scheduleMessage({
        number: number.trim(),
        message: message.trim(),
        scheduleTime: isoScheduleDateTime,
      });

      if (response.status && response.data?.scheduledMessage) {
        const newMsg = response.data.scheduledMessage;
        // Add to state immediately for instant UI update
        setScheduledMessages(prevMessages => 
          [...prevMessages, newMsg].sort((a, b) => 
            new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime()
          )
        );
        setSuccess('Message scheduled successfully!');
        setNumber('');
        setMessage('');
        setScheduleDate('');
        setScheduleTime('');
        // No need to call fetchScheduledMessages() here, polling will cover it or client-side update is enough.
      } else {
        setError(response.message || 'Failed to schedule message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setScheduling(false);
    }
  };

  // Handle deleting a scheduled message
  const handleDeleteScheduledMessage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this scheduled message?')) {
      setError(null); // Clear previous errors
      setSuccess(null); // Clear previous success messages
      try {
        const response = await deleteScheduledMessage(id);
        if (response.status) {
          setScheduledMessages(prevMessages => prevMessages.filter(msg => msg.id !== id));
          setSuccess('Scheduled message deleted successfully');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(response.message || 'Failed to delete scheduled message');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    }
  };

  // Format schedule time for display
  const formatScheduleTime = (isoString: string): string => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString();
  };

  // Determine message status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled': return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      case 'sent': return 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400';
      case 'failed': return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400';
      default: return 'bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400';
    }
  };

  return (
    <>
      <PageMeta title="Schedule WhatsApp Message" />
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-bold text-black dark:text-white">
            Schedule WhatsApp Message
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Schedule Form */}
          <div>
            <ComponentCard title="Schedule New Message">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 py-3 px-4 flex items-start dark:bg-red-500/10">
                  <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-lg bg-green-50 py-3 px-4 flex items-start dark:bg-green-500/10">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-green-600 dark:text-green-400">{success}</span>
                </div>
              )}

              <form onSubmit={handleScheduleMessage}>
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-gray-800 dark:text-white/90">
                    Recipient Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="62812345678"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    disabled={scheduling || status !== 'connected'}
                    className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                  />
                   <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Include country code without + (e.g., 62 for Indonesia)
                  </p>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-gray-800 dark:text-white/90">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={scheduling || status !== 'connected'}
                    className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                  ></textarea>
                </div>

                <div className="mb-4.5 grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2.5 block text-gray-800 dark:text-white/90">
                            Schedule Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            disabled={scheduling || status !== 'connected'}
                            className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                        />
                    </div>
                     <div>
                        <label className="mb-2.5 block text-gray-800 dark:text-white/90">
                            Schedule Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            disabled={scheduling || status !== 'connected'}
                            className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
                        />
                    </div>
                </div>

                <button
                  type="submit"
                  disabled={scheduling || status !== 'connected' || !number.trim() || !message.trim() || !scheduleDate || !scheduleTime}
                  className="flex w-full justify-center items-center rounded-lg bg-brand-500 py-3 px-6 font-medium text-white transition hover:bg-brand-600 disabled:bg-opacity-70 disabled:cursor-not-allowed dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  {scheduling ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Schedule Message
                    </>
                  )}
                </button>

                 {status !== 'connected' && (
                  <div className="mt-4 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 p-4">
                    <h5 className="mb-2 font-medium text-yellow-600 dark:text-yellow-400">WhatsApp Not Connected</h5>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      You need to connect to WhatsApp before scheduling messages.
                    </p>
                    <button
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

          {/* Scheduled Messages List */}
          <ComponentCard title="Scheduled Messages">
            {loading ? (
              <div className="flex h-60 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
              </div>
            ) : scheduledMessages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex flex-col items-center">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p className="font-medium text-lg text-gray-700 dark:text-gray-300">No scheduled messages</p>
                <p className="text-sm mt-2 max-w-xs text-gray-500 dark:text-gray-400">
                  Scheduled messages will appear here. Use the form to schedule your first message.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                         <div className={`w-8 h-8 rounded-full ${getStatusColor(msg.status)} flex items-center justify-center mr-3`}>
                            {msg.status === 'scheduled' && (
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            )}
                            {msg.status === 'sent' && (
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                             {msg.status === 'failed' && (
                                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                         </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">To: <span className="text-brand-500">+{msg.number}</span></span>
                      </div>
                      <span className={`inline-flex items-center rounded-full py-1 px-3 text-xs font-medium ${getStatusColor(msg.status)}`}>
                        {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                      </span>
                    </div>
                    <div className="pl-11">
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] p-3 rounded-lg">{msg.message}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          Scheduled: {formatScheduleTime(msg.scheduleTime)}
                        </p>
                        {msg.status === 'scheduled' && (
                            <button
                                onClick={() => handleDeleteScheduledMessage(msg.id)}
                                className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                            >
                                <TrashBinIcon className="w-3 h-3 mr-1" />
                                Cancel
                            </button>
                        )}
                         {msg.status === 'failed' && msg.error && (
                            <p className="text-xs text-red-500 dark:text-red-400 flex items-center">
                                Error: {msg.error}
                            </p>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ComponentCard>
        </div>
      </div>
    </>
  );
};

export default ScheduleMessage;