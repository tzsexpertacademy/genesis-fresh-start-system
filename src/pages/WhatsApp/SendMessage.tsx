import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { getConnectionStatus } from '../../services/whatsappService';
import SimpleMessageForm from '../../components/whatsapp/SimpleMessageForm';

const SendMessage = () => {
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
      <PageMeta title="Send Message - WhatsApp" />
      <div className="mx-auto max-w-270">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-white">
          Send WhatsApp Message
        </h1>
        
        {status === 'connected' ? (
          <SimpleMessageForm onClose={() => navigate('/whatsapp/dashboard')} />
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

export default SendMessage;