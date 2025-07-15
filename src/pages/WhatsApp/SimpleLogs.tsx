import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { getConnectionStatus } from '../../services/whatsappService';

const SimpleLogs = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [logs] = useState<string[]>([
    'WhatsApp service initialized',
    'Checking connection status...',
    'Ready to receive commands'
  ]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await getConnectionStatus();
        if (response.status) {
          setStatus(response.data);
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <PageMeta title="WhatsApp Logs" />
      <div className="mx-auto max-w-270">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-white">
          WhatsApp Activity Logs
        </h1>
        
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Current Status: {status}
            </h3>
          </div>
          <div className="p-6.5">
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleTimeString()} - {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SimpleLogs;