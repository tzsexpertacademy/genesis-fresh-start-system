import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusCard from '../../components/whatsapp/StatusCard';
import { getConnectionStatus } from '../../services/whatsappService';
import ComponentCard from '../../components/common/ComponentCard';
import PageMeta from '../../components/common/PageMeta';

const Dashboard = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [stats, setStats] = useState({
    sent: 0,
    received: 0,
    failed: 0,
    queued: 0,
  });
  const navigate = useNavigate();

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);

    // Redirect to login page if disconnected
    if (newStatus === 'disconnected') {
      navigate('/whatsapp/login');
    }
  };

  // Check connection status on mount
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const response = await getConnectionStatus();

        // Only update state if component is still mounted
        if (isMounted && response.status) {
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

    // Initial check
    checkStatus();

    // Simulate stats for demo purposes - less frequent updates
    const interval = setInterval(() => {
      if (isMounted) {
        setStats((prev) => ({
          sent: prev.sent + Math.floor(Math.random() * 3),
          received: prev.received + Math.floor(Math.random() * 2),
          failed: prev.failed + (Math.random() > 0.8 ? 1 : 0),
          queued: Math.floor(Math.random() * 5),
        }));
      }
    }, 15000);

    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [navigate]);

  return (
    <>
      <PageMeta
        title="WhatsApp Gateway Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="WhatsApp Gateway Dashboard for sending and receiving messages"
      />
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            WhatsApp Gateway Dashboard
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/whatsapp/send')}
              className="inline-flex items-center justify-center rounded-md bg-brand-500 py-2 px-4 text-center font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
              </svg>
              Send Message
            </button>
            <button
              onClick={() => navigate('/whatsapp/send-media')}
              className="inline-flex items-center justify-center rounded-md bg-green-500 py-2 px-4 text-center font-medium text-white hover:bg-green-600 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Send Media
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
          <StatusCard onStatusChange={handleStatusChange} />

          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
            <div className="flex items-center">
              <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 mr-4">
                <svg
                  className="fill-brand-500"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 10.8889C21 16.7981 16.2034 21.6 10.5 21.6C4.79658 21.6 0 16.7981 0 10.8889C0 4.97969 4.79658 0.177765 10.5 0.177765C16.2034 0.177765 21 4.97969 21 10.8889Z"
                    fill="currentColor"
                    fillOpacity="0.15"
                  />
                  <path
                    d="M10.5 4.67776C7.2882 4.67776 4.66667 7.2993 4.66667 10.5111C4.66667 13.7229 7.2882 16.3444 10.5 16.3444C13.7118 16.3444 16.3333 13.7229 16.3333 10.5111C16.3333 7.2993 13.7118 4.67776 10.5 4.67776ZM10.5 15.0111C8.02354 15.0111 6 12.9876 6 10.5111C6 8.03465 8.02354 6.01109 10.5 6.01109C12.9765 6.01109 15 8.03465 15 10.5111C15 12.9876 12.9765 15.0111 10.5 15.0111Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.sent}
                </h4>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Messages Sent</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
            <div className="flex items-center">
              <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10 mr-4">
                <svg
                  className="fill-green-500"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 10.8889C21 16.7981 16.2034 21.6 10.5 21.6C4.79658 21.6 0 16.7981 0 10.8889C0 4.97969 4.79658 0.177765 10.5 0.177765C16.2034 0.177765 21 4.97969 21 10.8889Z"
                    fill="currentColor"
                    fillOpacity="0.15"
                  />
                  <path
                    d="M10.5 4.67776C7.2882 4.67776 4.66667 7.2993 4.66667 10.5111C4.66667 13.7229 7.2882 16.3444 10.5 16.3444C13.7118 16.3444 16.3333 13.7229 16.3333 10.5111C16.3333 7.2993 13.7118 4.67776 10.5 4.67776ZM10.5 15.0111C8.02354 15.0111 6 12.9876 6 10.5111C6 8.03465 8.02354 6.01109 10.5 6.01109C12.9765 6.01109 15 8.03465 15 10.5111C15 12.9876 12.9765 15.0111 10.5 15.0111Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.received}
                </h4>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Messages Received</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
            <div className="flex items-center">
              <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 mr-4">
                <svg
                  className="fill-red-500"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 10.8889C21 16.7981 16.2034 21.6 10.5 21.6C4.79658 21.6 0 16.7981 0 10.8889C0 4.97969 4.79658 0.177765 10.5 0.177765C16.2034 0.177765 21 4.97969 21 10.8889Z"
                    fill="currentColor"
                    fillOpacity="0.15"
                  />
                  <path
                    d="M10.5 4.67776C7.2882 4.67776 4.66667 7.2993 4.66667 10.5111C4.66667 13.7229 7.2882 16.3444 10.5 16.3444C13.7118 16.3444 16.3333 13.7229 16.3333 10.5111C16.3333 7.2993 13.7118 4.67776 10.5 4.67776ZM10.5 15.0111C8.02354 15.0111 6 12.9876 6 10.5111C6 8.03465 8.02354 6.01109 10.5 6.01109C12.9765 6.01109 15 8.03465 15 10.5111C15 12.9876 12.9765 15.0111 10.5 15.0111Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.failed}
                </h4>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed Messages</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
          <div className="col-span-12">
            <ComponentCard
              title="WhatsApp Gateway Features"
              desc="Explore the capabilities of your WhatsApp Gateway"
            >

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div
                  onClick={() => navigate('/whatsapp/send')}
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 mr-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                    <svg
                      className="fill-brand-500"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 10.8889C21 16.7981 16.2034 21.6 10.5 21.6C4.79658 21.6 0 16.7981 0 10.8889C0 4.97969 4.79658 0.177765 10.5 0.177765C16.2034 0.177765 21 4.97969 21 10.8889Z"
                        fill="currentColor"
                        fillOpacity="0.15"
                      />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">Send Messages</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Send text messages to any WhatsApp number</p>
                    <span className="inline-flex items-center text-xs text-brand-500 dark:text-brand-400 mt-2 group-hover:underline">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                      Click to send message
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => navigate('/whatsapp/send-media')}
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10 mr-4 group-hover:bg-green-100 dark:group-hover:bg-green-500/20 transition-colors">
                    <svg
                      className="fill-green-500"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 10.8889C21 16.7981 16.2034 21.6 10.5 21.6C4.79658 21.6 0 16.7981 0 10.8889C0 4.97969 4.79658 0.177765 10.5 0.177765C16.2034 0.177765 21 4.97969 21 10.8889Z"
                        fill="currentColor"
                        fillOpacity="0.15"
                      />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Send Media</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Share images, PDFs, and documents</p>
                    <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400 mt-2 group-hover:underline">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                      Click to send media
                    </span>
                  </div>
                </div>

                <div className="flex items-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-500/10 mr-4">
                    <svg
                      className="fill-yellow-500"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 10.8889C21 16.7981 16.2034 21.6 10.5 21.6C4.79658 21.6 0 16.7981 0 10.8889C0 4.97969 4.79658 0.177765 10.5 0.177765C16.2034 0.177765 21 4.97969 21 10.8889Z"
                        fill="currentColor"
                        fillOpacity="0.15"
                      />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Auto-Reply</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Set up automatic responses to incoming messages</p>
                  </div>
                </div>

                <div className="flex items-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/10 mr-4">
                    <svg
                      className="fill-purple-500"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 10.8889C21 16.7981 16.2034 21.6 10.5 21.6C4.79658 21.6 0 16.7981 0 10.8889C0 4.97969 4.79658 0.177765 10.5 0.177765C16.2034 0.177765 21 4.97969 21 10.8889Z"
                        fill="currentColor"
                        fillOpacity="0.15"
                      />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Activity Logs</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Track all WhatsApp activity in real-time</p>
                  </div>
                </div>
              </div>
            </ComponentCard>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
