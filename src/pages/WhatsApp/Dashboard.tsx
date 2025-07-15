import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/common/ComponentCard';
import SimpleStatusCard from '../../components/whatsapp/SimpleStatusCard';
import { getConnectionStatus } from '../../services/whatsappService';
import PageMeta from '../../components/common/PageMeta';

const Dashboard = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('disconnected');

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

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
  };

  return (
    <>
      <PageMeta title="Dashboard - WhatsApp" />
      <div className="mx-auto max-w-270">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-white">
          WhatsApp Gateway Dashboard
        </h1>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <SimpleStatusCard onStatusChange={handleStatusChange} />
          
          <ComponentCard
            title="Send Message"
            desc="Send text messages to contacts"
          >
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/whatsapp/send-message')}
                className="w-full rounded bg-primary py-2 px-4 text-white hover:bg-opacity-90"
              >
                Send Message
              </button>
            </div>
          </ComponentCard>

          <ComponentCard
            title="Inbox"
            desc="View received messages"
          >
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/whatsapp/enhanced-inbox')}
                className="w-full rounded bg-secondary py-2 px-4 text-white hover:bg-opacity-90"
              >
                View Inbox
              </button>
            </div>
          </ComponentCard>

          <ComponentCard
            title="Contacts"
            desc="Manage your contacts"
          >
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/whatsapp/contacts')}
                className="w-full rounded bg-success py-2 px-4 text-white hover:bg-opacity-90"
              >
                Manage Contacts
              </button>
            </div>
          </ComponentCard>

          <ComponentCard
            title="Quick Actions"
            desc="Common tasks"
          >
            <div className="flex flex-col gap-3">
              {status !== 'connected' ? (
                <button
                  onClick={() => navigate('/whatsapp/login')}
                  className="w-full rounded bg-danger py-2 px-4 text-white hover:bg-opacity-90"
                >
                  Connect WhatsApp
                </button>
              ) : (
                <button
                  onClick={() => navigate('/whatsapp/blast-message')}
                  className="w-full rounded bg-info py-2 px-4 text-white hover:bg-opacity-90"
                >
                  Blast Message
                </button>
              )}
            </div>
          </ComponentCard>
        </div>
      </div>
    </>
  );
};

export default Dashboard;