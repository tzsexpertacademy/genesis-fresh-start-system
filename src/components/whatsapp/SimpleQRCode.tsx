import { useState, useEffect } from 'react';
import { getQRCode, getConnectionStatus } from '../../services/whatsappService';

const SimpleQRCode = () => {
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const qrResponse = await getQRCode();
        if (qrResponse.status) {
          setQrCode(qrResponse.data);
        }
        
        const statusResponse = await getConnectionStatus();
        if (statusResponse.status) {
          setStatus(statusResponse.data);
        }
      } catch (error) {
        console.error('Error fetching QR code or status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
    
    // Check status every 5 seconds
    const interval = setInterval(async () => {
      try {
        const statusResponse = await getConnectionStatus();
        if (statusResponse.status) {
          setStatus(statusResponse.data);
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="text-center p-8">
        <div className="text-green-500 text-lg font-semibold mb-2">
          ✓ WhatsApp Connected
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Your WhatsApp is ready to use!
        </p>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
        Scan QR Code to Connect
      </h3>
      {qrCode && (
        <div className="flex justify-center mb-4">
          <img 
            src={qrCode} 
            alt="WhatsApp QR Code" 
            className="w-64 h-64 border border-stroke dark:border-strokedark rounded"
          />
        </div>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Open WhatsApp on your phone and scan this QR code
      </p>
      <div className="mt-4 text-sm">
        Status: <span className="font-semibold">{status}</span>
      </div>
    </div>
  );
};

export default SimpleQRCode;