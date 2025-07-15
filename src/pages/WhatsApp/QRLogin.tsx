import PageMeta from '../../components/common/PageMeta';
import SimpleQRCode from '../../components/whatsapp/SimpleQRCode';

const QRLogin = () => {

  const handleLogout = async () => {
    try {
      // Reset connection functionality will be implemented here
      console.log('Resetting connection...');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      <PageMeta title="WhatsApp Login - QR Code" />
      <div className="mx-auto max-w-270">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-black dark:text-white">
                WhatsApp Login
              </h3>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded border border-danger bg-danger py-1 px-3 text-center text-sm font-medium text-white hover:bg-opacity-90"
              >
                Reset Connection
              </button>
            </div>
          </div>
          <div className="p-6.5">
            <SimpleQRCode />
          </div>
        </div>
      </div>
    </>
  );
};

export default QRLogin;
