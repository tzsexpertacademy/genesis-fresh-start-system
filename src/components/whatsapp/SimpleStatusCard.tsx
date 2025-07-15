import { useEffect, useState } from 'react';
import { getConnectionStatus, logout } from '../../services/whatsappService';
import ComponentCard from '../common/ComponentCard';

interface StatusCardProps {
  onStatusChange?: (status: string) => void;
}

const SimpleStatusCard = ({ onStatusChange }: StatusCardProps) => {
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const response = await getConnectionStatus();
      if (response.status) {
        setStatus(response.data);
        if (onStatusChange) {
          onStatusChange(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      setStatus('disconnected');
      if (onStatusChange) {
        onStatusChange('disconnected');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ComponentCard
      title="WhatsApp Status"
      desc="Current connection status"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full mr-3 sm:mr-4 flex-shrink-0 ${
              status === 'connected'
                ? 'bg-success-50 text-success-600'
                : status === 'connecting'
                ? 'bg-warning-50 text-warning-600'
                : 'bg-error-50 text-error-600'
            }`}
          >
            <svg
              className="fill-current"
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
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </h4>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {status === 'connected'
                ? 'Ready to send and receive messages'
                : status === 'connecting'
                ? 'Waiting for connection...'
                : 'Not connected to WhatsApp'}
            </span>
          </div>
        </div>

        {status === 'connected' && (
          <button
            onClick={handleLogout}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md border border-error-500 bg-error-500 py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 sm:self-center disabled:opacity-70"
          >
            {loading ? 'Logging out...' : 'Logout'}
          </button>
        )}
      </div>
    </ComponentCard>
  );
};

export default SimpleStatusCard;