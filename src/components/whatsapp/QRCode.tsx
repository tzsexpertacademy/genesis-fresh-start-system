import { useEffect, useState, useRef } from 'react';
import { getQRCode, getConnectionStatus } from '../../services/whatsappService';
import ComponentCard from '../common/ComponentCard';

interface QRCodeProps {
  onStatusChange?: (status: string) => void;
}

const QRCode = ({ onStatusChange }: QRCodeProps) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(15);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch QR code and status
  const fetchQRCode = async () => {
    try {
      // Only set loading to true if we don't already have a QR code
      if (!qrCode) {
        setLoading(true);
      }
      setError(null);

      const response = await getQRCode();
      if (response.status && response.data.qrCode) {
        setQrCode(response.data.qrCode);
      } else {
        // Don't clear existing QR code if the request fails
        if (!qrCode) {
          setQrCode(null);
        }
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      setError('Failed to fetch QR code. Please try again.');
      // Don't clear existing QR code on error
      if (!qrCode) {
        setQrCode(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch connection status
  const fetchStatus = async () => {
    try {
      const response = await getConnectionStatus();
      if (response.status) {
        setStatus(response.data.status);
        if (onStatusChange) {
          onStatusChange(response.data.status);
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  // Start countdown timer
  const startCountdown = () => {
    // Reset countdown
    setCountdown(15);

    // Clear any existing interval
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Start new countdown
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // When countdown reaches 0, clear the interval
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 15; // Reset to 15 for next cycle
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Fetch QR code and status on component mount
  useEffect(() => {
    // Initial fetch
    fetchQRCode();
    fetchStatus();
    startCountdown();

    // Poll for status updates
    const statusInterval = setInterval(fetchStatus, 5000);

    // Poll for QR code more frequently to ensure it's always fresh
    // This helps users who might have missed the initial QR code
    const qrInterval = setInterval(() => {
      if (status !== 'connected') {
        fetchQRCode();
        startCountdown(); // Restart countdown after QR refresh
      }
    }, 15000); // Refresh every 15 seconds

    return () => {
      clearInterval(statusInterval);
      clearInterval(qrInterval);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []); // Remove status dependency to prevent infinite loops

  // Render based on status
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 text-red-600 p-4 rounded-md dark:bg-red-500/10 dark:text-red-400">
          <p>{error}</p>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-md mt-2 hover:bg-red-600 transition-colors"
            onClick={fetchQRCode}
          >
            Retry
          </button>
        </div>
      );
    }

    if (status === 'connected') {
      return (
        <div className="bg-green-50 p-6 rounded-lg flex items-start dark:bg-green-500/10">
          <div className="mr-4 bg-green-100 p-3 rounded-full dark:bg-green-500/20">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">WhatsApp is connected!</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">You can now send and receive messages.</p>
            <button className="mt-4 bg-brand-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-600 transition-all duration-300 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    if (qrCode) {
      return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="relative w-full max-w-xs mx-auto md:mx-0">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-brand-600 opacity-10 rounded-lg blur-lg transform scale-105 dark:opacity-20"></div>
            <div className="border-2 border-gray-200 rounded-lg p-2 sm:p-3 bg-white shadow-md relative dark:border-gray-700 dark:bg-gray-800">
              <div className="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-brand-500 rounded-tl-md"></div>
              <div className="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-brand-500 rounded-tr-md"></div>
              <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-brand-500 rounded-bl-md"></div>
              <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-brand-500 rounded-br-md"></div>
              <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-auto" />
            </div>
          </div>
          <div className="md:flex-1 md:max-w-sm text-center md:text-left">
            <p className="text-sm text-gray-600 mb-2 dark:text-gray-300">
              Scan this QR code with your WhatsApp app to connect
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start text-xs text-gray-500 bg-gray-50 p-2 rounded-md dark:bg-white/[0.03] dark:text-gray-400 mb-3">
              <svg className="w-4 h-4 mr-1 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Open WhatsApp &gt; Menu &gt; Linked Devices &gt; Link a Device</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              QR code refreshes in <span className="font-medium">{countdown}</span> seconds
            </p>
            <button
              onClick={() => {
                fetchQRCode();
                startCountdown();
              }}
              className="inline-flex items-center justify-center rounded-md bg-gray-100 text-gray-700 py-1.5 px-3 text-sm font-medium hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh QR Code
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 text-yellow-600 p-4 rounded-md dark:bg-yellow-500/10 dark:text-yellow-400">
        <p>No QR code available. Please try again later.</p>
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded-md mt-2 hover:bg-yellow-600 transition-colors"
          onClick={fetchQRCode}
        >
          Refresh
        </button>
      </div>
    );
  };

  return (
    <ComponentCard
      title="WhatsApp Connection"
      desc="Connect your WhatsApp account by scanning the QR code"
    >
      <div className="flex items-center mb-5 bg-gray-50 p-3 rounded-md dark:bg-white/[0.03]">
        <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
            status === 'connected'
              ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
              : status === 'connecting'
              ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}
        >
          <span className={`w-2 h-2 rounded-full mr-1.5 ${
            status === 'connected'
              ? 'bg-green-500'
              : status === 'connecting'
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}></span>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <div className="transition-all duration-300">
        {renderContent()}
      </div>
    </ComponentCard>
  );
};

export default QRCode;
