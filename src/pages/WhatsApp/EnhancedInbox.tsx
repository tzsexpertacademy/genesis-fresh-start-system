import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedInboxTable from '../../components/whatsapp/EnhancedInboxTable';
import QRCode from '../../components/whatsapp/QRCode';
import PageMeta from '../../components/common/PageMeta';
import stateManager from '../../utils/stateManager';
import websocketService from '../../services/websocketService';
import { WhatsAppConnectionStatus } from '../../types/whatsapp';

const EnhancedInbox = () => {
  const [status, setStatus] = useState<WhatsAppConnectionStatus>('unknown');
  const [loading, setLoading] = useState<boolean>(true);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  // Initialize WebSocket connection and event listeners
  useEffect(() => {
    // Set component as mounted
    isMounted.current = true;
    
    // Register component as active
    stateManager.registerComponent('inbox');
    
    // Connect to WebSocket
    websocketService.connect();
    
    // Set up event listeners
    websocketService.on('connection_status', (newStatus) => {
      if (isMounted.current) {
        setStatus(newStatus);
        setLoading(false);
        
        if (newStatus === 'disconnected') {
          setShowQRCode(true);
        } else if (newStatus === 'connected') {
          setShowQRCode(false);
        }
      }
    });
    
    // Request connection status
    websocketService.requestStatus();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      stateManager.unregisterComponent('inbox');
      
      // Remove event listeners
      websocketService.off('connection_status', () => {});
    };
  }, [navigate]);

  // Handle QR code scan success
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as WhatsAppConnectionStatus);
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
              status === 'connected' ? 'bg-green-500' : 
              status === 'connecting' ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {status === 'connected' ? 'Connected' : 
               status === 'connecting' ? 'Connecting...' : 
               'Disconnected'}
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
          <EnhancedInboxTable />
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
export default memo(EnhancedInbox);
