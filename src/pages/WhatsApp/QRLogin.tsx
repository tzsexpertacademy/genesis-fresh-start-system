import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from '../../components/whatsapp/QRCode';
import { logout } from '../../services/whatsappService';
import ComponentCard from '../../components/common/ComponentCard';
import PageMeta from '../../components/common/PageMeta';

const QRLogin = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);

    // No automatic redirect - let the user decide when to navigate
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      setStatus('disconnected');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="WhatsApp Gateway Login | TailAdmin - React.js Admin Dashboard Template"
        description="Connect your WhatsApp account to the gateway"
      />
      <div className="mx-auto max-w-270">
        <div className="grid grid-cols-1 gap-4 md:gap-8">
          <div className="w-full">
            <ComponentCard
              title="WhatsApp Gateway - Connect Your Device"
              desc="Scan the QR code with your phone to connect"
            >
              <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center p-4 bg-gray-50 dark:bg-white/[0.03] rounded-lg mb-6">
                  <div className="md:mr-4 mb-3 md:mb-0 flex-shrink-0">
                    <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    To use the WhatsApp Gateway, connect your WhatsApp account by scanning the QR code below with your phone.
                  </p>
                </div>

                <div className="mb-4">
                  <QRCode onStatusChange={handleStatusChange} />
                </div>

                {status === 'connected' && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                    <div className="text-green-600 dark:text-green-400 mb-3 sm:mb-0">
                      <p className="font-semibold text-lg">Connected successfully!</p>
                      <p className="text-sm">You can now proceed to the dashboard</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => navigate('/whatsapp/dashboard')}
                        className="inline-flex items-center justify-center rounded-md border border-green-500 bg-green-500 text-white py-2 px-6 text-center font-medium hover:bg-green-600 hover:border-green-600 transition-all duration-300"
                      >
                        Go to Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md border border-red-500 bg-white dark:bg-transparent text-red-500 py-2 px-6 text-center font-medium hover:bg-red-500 hover:text-white transition-all duration-300 disabled:opacity-70"
                      >
                        {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Logging out...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                          </svg>
                          Logout
                        </>
                      )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <svg className="w-5 h-5 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Instructions
                      </h4>
                      <div className="bg-gray-50 dark:bg-white/[0.03] p-4 rounded-lg">
                        <ol className="list-none space-y-3">
                          <li className="flex items-start">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold mr-3 mt-0.5">1</span>
                            <span className="text-gray-700 dark:text-gray-300">Open WhatsApp on your phone</span>
                          </li>
                          <li className="flex items-start">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold mr-3 mt-0.5">2</span>
                            <span className="text-gray-700 dark:text-gray-300">Tap Menu or Settings and select Linked Devices</span>
                          </li>
                          <li className="flex items-start">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold mr-3 mt-0.5">3</span>
                            <span className="text-gray-700 dark:text-gray-300">Tap on "Link a Device"</span>
                          </li>
                          <li className="flex items-start">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold mr-3 mt-0.5">4</span>
                            <span className="text-gray-700 dark:text-gray-300">Point your phone to this screen to capture the QR code</span>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 p-4 h-fit self-end">
                      <div className="flex">
                        <svg className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <div>
                          <h5 className="mb-1 font-medium text-yellow-600 dark:text-yellow-400">Important Note</h5>
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            This is an unofficial WhatsApp Gateway for learning purposes only. Do not use it for spam or any activities that violate WhatsApp's Terms of Service.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ComponentCard>
          </div>
        </div>


      </div>
    </>
  );
};

export default QRLogin;
