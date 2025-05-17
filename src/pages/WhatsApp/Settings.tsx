import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsForm from '../../components/whatsapp/SettingsForm';
import { getConnectionStatus } from '../../services/whatsappService';

const Settings = () => {
  const [status, setStatus] = useState<string>('disconnected');
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

  return (
    <>
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-bold text-black">
            WhatsApp Gateway Settings
          </h2>
        </div>
        
        {status !== 'connected' ? (
          <div className="rounded-sm border border-warning bg-warning bg-opacity-10 p-4">
            <h5 className="mb-2 font-medium text-warning">WhatsApp Not Connected</h5>
            <p className="text-sm">
              You need to connect to WhatsApp to manage settings.
            </p>
            <button
              onClick={() => navigate('/whatsapp/login')}
              className="mt-2 inline-flex items-center justify-center rounded-md border border-warning bg-warning py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
            >
              Go to Login Page
            </button>
          </div>
        ) : (
          <SettingsForm />
        )}
      </div>
    </>
  );
};

export default Settings;
