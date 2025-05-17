import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MediaUpload from '../../components/whatsapp/MediaUpload';
import { getConnectionStatus } from '../../services/whatsappService';
import ComponentCard from '../../components/common/ComponentCard';
import PageMeta from '../../components/common/PageMeta';

interface MediaHistory {
  id: string;
  to: string;
  fileName: string;
  timestamp: string;
  status: 'sent' | 'failed';
}

const SendMedia = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [history, setHistory] = useState<MediaHistory[]>([]);
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

  // Handle media sent
  const handleMediaSent = (result: any) => {
    const newMedia: MediaHistory = {
      id: result.messageId,
      to: result.to,
      fileName: result.fileName,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setHistory((prev) => [newMedia, ...prev]);
  };

  return (
    <>
      <PageMeta
        title="Send WhatsApp Media | TailAdmin - React.js Admin Dashboard Template"
        description="Send media files through WhatsApp"
      />
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Send WhatsApp Media
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <MediaUpload
              onMediaSent={handleMediaSent}
              disabled={status !== 'connected'}
            />

            {status !== 'connected' && (
              <div className="mt-4 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 p-4">
                <h5 className="mb-2 font-medium text-yellow-600 dark:text-yellow-400">WhatsApp Not Connected</h5>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  You need to connect to WhatsApp before sending media.
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
            title="Media History"
            desc="Your recently sent media files"
          >
              {history.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <p className="font-medium text-lg text-gray-700 dark:text-gray-300">No media sent yet</p>
                  <p className="text-sm mt-2 max-w-xs text-gray-500 dark:text-gray-400">
                    Your sent media files will appear here. Try sending an image or document.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center mr-3">
                            <svg
                              className="w-4 h-4 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                          <span className="font-medium text-gray-800 dark:text-gray-200">To: <span className="text-green-500">+{item.to}</span></span>
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
                        <div className="flex items-center mt-2 bg-gray-50 dark:bg-white/[0.03] p-3 rounded-lg">
                          <svg
                            className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm text-gray-600 dark:text-gray-300 break-all">{item.fileName}</span>
                        </div>
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
          </ComponentCard>
        </div>
      </div>
    </>
  );
};

export default SendMedia;
