import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import InboxTable from '../../components/whatsapp/InboxTable';
import { getConnectionStatus } from '../../services/whatsappService';
import stateManager from '../../utils/stateManager';

const Inbox = () => {
  const [status, setStatus] = useState<string>('connected'); // Assume connected initially to avoid flicker
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const lastCheckTime = useRef(0);

  // Check connection status on mount with improved handling
  useEffect(() => {
    // Track if component is mounted
    isMounted.current = true;

    // Register this component as active
    stateManager.registerComponent('inbox');

    const checkStatus = async () => {
      // Use debouncing to prevent multiple rapid checks
      if (!stateManager.debounce('inbox_status_check', 5000)) {
        console.log('Debouncing inbox status check');
        return;
      }

      // Throttle checks to at most once every 10 seconds
      const now = Date.now();
      if (now - lastCheckTime.current < 10000) {
        return;
      }

      lastCheckTime.current = now;

      try {
        if (isMounted.current) setLoading(true);

        const response = await getConnectionStatus();

        if (!isMounted.current) return;

        if (response.status) {
          // Only update state if status has changed
          if (status !== response.data.status) {
            setStatus(response.data.status);
          }

          // Redirect to login page if disconnected
          if (response.data.status === 'disconnected') {
            navigate('/whatsapp/login');
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    // Use a short timeout before initial check to allow the component to fully mount
    // This helps prevent the flickering issue
    const initialCheckTimeout = setTimeout(() => {
      // Initial check
      checkStatus();
    }, 100);

    // Check status periodically, but much less frequently (every 120 seconds)
    const interval = setInterval(() => {
      // Only check if no processing is happening
      if (!stateManager.isProcessing()) {
        checkStatus();
      } else {
        console.log('Skipping status check - processing in progress');
      }
    }, 120000); // Increased from 60s to 120s

    // Cleanup function
    return () => {
      clearTimeout(initialCheckTimeout);
      isMounted.current = false;
      stateManager.unregisterComponent('inbox');
      clearInterval(interval);
    };
  }, [navigate]);

  return (
    <>
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <h2 className="text-title-md2 font-bold text-black dark:text-white">
              WhatsApp Inbox
            </h2>
            {loading && (
              <div className="ml-3 animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
            )}
          </div>
        </div>

        {status !== 'connected' ? (
          <div className="rounded-sm border border-warning bg-warning bg-opacity-10 p-4">
            <h5 className="mb-2 font-medium text-warning">WhatsApp Not Connected</h5>
            <p className="text-sm">
              You need to connect to WhatsApp to view your inbox.
            </p>
            <button
              onClick={() => navigate('/whatsapp/login')}
              className="mt-2 inline-flex items-center justify-center rounded-md border border-warning bg-warning py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
            >
              Go to Login Page
            </button>
          </div>
        ) : (
          <InboxTable />
        )}
      </div>
    </>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(Inbox);
