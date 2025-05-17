import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import ImprovedInboxTable from '../../components/whatsapp/ImprovedInboxTable';
import { getConnectionStatus } from '../../services/whatsappService';
import stateManager from '../../utils/stateManager';
import QRCode from '../../components/whatsapp/QRCode';
import PageMeta from '../../components/common/PageMeta';

const ImprovedInbox = () => {
  const [status, setStatus] = useState<string>('connected'); // Assume connected initially to avoid flicker
  const [loading, setLoading] = useState<boolean>(true);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
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
            
            // Show QR code if disconnected
            if (response.data.status === 'disconnected') {
              setShowQRCode(true);
            } else {
              setShowQRCode(false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
        // If there's an error, assume disconnected
        setStatus('disconnected');
        setShowQRCode(true);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    // Use a short timeout before initial check to allow the component to fully mount
    const initialCheckTimeout = setTimeout(() => {
      // Initial check
      checkStatus();
    }, 100);

    // Check status periodically
    const interval = setInterval(checkStatus, 30000);

    // Cleanup function
    return () => {
      isMounted.current = false;
      clearTimeout(initialCheckTimeout);
      clearInterval(interval);
      stateManager.unregisterComponent('inbox');
    };
  }, [status, navigate]);

  // Handle QR code scan success
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === 'connected') {
      setShowQRCode(false);
    }
  };

  return (
    <>
      <PageMeta title="WhatsApp Inbox" />
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
          
          {/* Connection status indicator */}
          <div className="flex items-center">
            <div className={`w-2.5 h-2.5 rounded-full mr-2 ${
              status === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {status === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
            
            {status !== 'connected' && (
              <button
                onClick={() => setShowQRCode(true)}
                className="ml-3 text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>

        {/* QR Code for reconnection */}
        {showQRCode && status !== 'connected' && (
          <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-sm border border-stroke dark:border-strokedark shadow-default">
            <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Scan QR Code to Connect WhatsApp</h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Your WhatsApp account is disconnected. Please scan the QR code below with your phone to connect.
            </p>
            <QRCode onStatusChange={handleStatusChange} />
          </div>
        )}

        {/* Show inbox only when connected */}
        {status === 'connected' ? (
          <ImprovedInboxTable />
        ) : !showQRCode && (
          <div className="rounded-sm border border-warning bg-warning bg-opacity-10 p-4">
            <h5 className="mb-2 font-medium text-warning">WhatsApp Not Connected</h5>
            <p className="text-sm">
              You need to connect to WhatsApp to view your inbox.
            </p>
            <button
              onClick={() => setShowQRCode(true)}
              className="mt-2 inline-flex items-center justify-center rounded-md border border-warning bg-warning py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
            >
              Connect WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(ImprovedInbox);
