import PageMeta from '../../components/common/PageMeta';
import SimpleInbox from '../../components/whatsapp/SimpleInbox';

const GeminiAI = () => {
  return (
    <>
      <PageMeta title="Gemini AI - WhatsApp" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Gemini AI Assistant</h2>
          <p className="text-gray-600 dark:text-gray-400">Configure your Gemini AI settings here.</p>
          <SimpleInbox />
        </div>
      </div>
    </>
  );
};

export default GeminiAI;