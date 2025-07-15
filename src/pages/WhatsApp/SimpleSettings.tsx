import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { getConnectionStatus } from '../../services/whatsappService';

const Settings = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('disconnected');

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
        navigate('/whatsapp/login');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <>
      <PageMeta title="WhatsApp Settings" />
      <div className="mx-auto max-w-270">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-white">
          WhatsApp Settings
        </h1>
        
        {status === 'connected' ? (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Basic Settings
              </h3>
            </div>
            <div className="p-6.5">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                WhatsApp is connected and ready to use.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded border border-stroke p-4 dark:border-strokedark">
                  <h4 className="font-medium text-black dark:text-white mb-2">
                    Connection Status
                  </h4>
                  <span className="inline-block rounded-full bg-success bg-opacity-10 px-3 py-1 text-sm font-medium text-success">
                    Connected
                  </span>
                </div>
                <div className="rounded border border-stroke p-4 dark:border-strokedark">
                  <h4 className="font-medium text-black dark:text-white mb-2">
                    Quick Actions
                  </h4>
                  <button
                    onClick={() => navigate('/whatsapp/login')}
                    className="rounded bg-primary py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    Reset Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="text-center">
              <p className="mb-4 text-lg text-black dark:text-white">
                WhatsApp is not connected
              </p>
              <button
                onClick={() => navigate('/whatsapp/login')}
                className="inline-flex items-center justify-center rounded-md border border-primary bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90"
              >
                Go to Login Page
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Settings;