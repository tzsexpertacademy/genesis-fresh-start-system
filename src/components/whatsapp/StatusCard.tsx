import { useEffect, useState, memo } from 'react';
import { getConnectionStatus, logout } from '../../services/whatsappService';
import ComponentCard from '../common/ComponentCard';
import { stateManager } from '../../utils/stateManager';
import { transitionUtils } from '../../utils/transitionUtils';

interface StatusCardProps {
  onStatusChange?: (status: string) => void;
}

const StatusCard = ({ onStatusChange }: StatusCardProps) => {
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch connection status - simplified approach
  const fetchStatus = async () => {
    // Check if we should throttle updates
    if (stateManager.shouldThrottleUpdates(5000)) {
      console.log('Throttling status update - too soon since last update');
      return;
    }

    // Check if Gemini chat is active and processing
    if (stateManager.isComponentActive('geminiChat') && stateManager.isProcessing()) {
      console.log('Skipping status update - Gemini chat is active and processing');
      return;
    }

    try {
      // Store previous status to detect significant changes
      const prevStatus = status;

      const response = await getConnectionStatus();
      if (response.status) {
        // Only update status if it's different to avoid unnecessary re-renders
        if (response.data !== status) {
          // If this is a significant status change, prevent animations
          if (prevStatus === 'disconnected' || response.data === 'disconnected') {
            transitionUtils.disableTransitions(500);
          }

          setStatus(response.data);

          if (onStatusChange) {
            onStatusChange(response.data);
          }

          // No need to re-enable transitions as they're automatically re-enabled after the timeout
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      // Don't update status on error to prevent flickering
    }
  };

  // No need for SidebarContext anymore

  // Handle logout - simplified approach
  const handleLogout = async () => {
    try {
      // Set processing state to prevent animations
      stateManager.setProcessing(true);
      transitionUtils.disableTransitions(1000);

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

      // Clear processing state after a delay
      setTimeout(() => {
        stateManager.setProcessing(false);
      }, 300); // Single delay to ensure all DOM updates are complete
    }
  };

  // Fetch status on component mount and periodically
  useEffect(() => {
    // Register this component as active
    stateManager.registerComponent('dashboard');

    // Initial fetch
    fetchStatus();

    // Poll much less frequently to reduce server load and prevent refresh issues
    const interval = setInterval(() => {
      // Only fetch if no processing is happening and we're not debouncing
      if (!stateManager.isProcessing() && stateManager.debounce('status_update', 5000)) {
        console.log('Scheduled status update');
        fetchStatus();
      } else {
        console.log('Skipping status update - processing in progress or debounced');
      }
    }, 30000); // Increased from 10s to 30s

    // Set up prevention of refresh during processing
    const cleanupRefreshPrevention = stateManager.preventRefreshDuringProcessing();

    // Cleanup function
    return () => {
      clearInterval(interval);
      stateManager.unregisterComponent('dashboard');
      cleanupRefreshPrevention();
    };
  }, []);

  return (
    <ComponentCard
      title="WhatsApp Status"
      desc="Current connection status"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <div
            className={`flex h-10 w-10 sm:h-11.5 sm:w-11.5 items-center justify-center rounded-full mr-3 sm:mr-4 flex-shrink-0 ${
              status === 'connected'
                ? 'bg-success-light text-success'
                : status === 'connecting'
                ? 'bg-warning-light text-warning'
                : 'bg-danger-light text-danger'
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
              <path
                d="M10.5 4.67776C7.2882 4.67776 4.66667 7.2993 4.66667 10.5111C4.66667 13.7229 7.2882 16.3444 10.5 16.3444C13.7118 16.3444 16.3333 13.7229 16.3333 10.5111C16.3333 7.2993 13.7118 4.67776 10.5 4.67776ZM10.5 15.0111C8.02354 15.0111 6 12.9876 6 10.5111C6 8.03465 8.02354 6.01109 10.5 6.01109C12.9765 6.01109 15 8.03465 15 10.5111C15 12.9876 12.9765 15.0111 10.5 15.0111Z"
                fill="currentColor"
              />
              <path
                d="M10.5 7.34443C8.76031 7.34443 7.33333 8.77142 7.33333 10.5111C7.33333 12.2508 8.76031 13.6778 10.5 13.6778C12.2397 13.6778 13.6667 12.2508 13.6667 10.5111C13.6667 8.77142 12.2397 7.34443 10.5 7.34443ZM10.5 12.3444C9.4959 12.3444 8.66667 11.5152 8.66667 10.5111C8.66667 9.50697 9.4959 8.67776 10.5 8.67776C11.5041 8.67776 12.3333 9.50697 12.3333 10.5111C12.3333 11.5152 11.5041 12.3444 10.5 12.3444Z"
                fill="currentColor"
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
            className="inline-flex items-center justify-center rounded-md border border-danger bg-danger py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 sm:self-center disabled:opacity-70"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging out...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                Logout
              </span>
            )}
          </button>
        )}
      </div>
    </ComponentCard>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(StatusCard);
