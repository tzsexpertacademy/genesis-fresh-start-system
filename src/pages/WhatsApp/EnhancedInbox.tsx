import PageMeta from '../../components/common/PageMeta';
import CleanEnhancedInbox from '../../components/whatsapp/CleanEnhancedInbox';

const EnhancedInbox = () => {
  return (
    <>
      <PageMeta title="Enhanced Inbox - WhatsApp" />
      
      <div className="container mx-auto px-4 py-6">
        <CleanEnhancedInbox />
      </div>
    </>
  );
};

export default EnhancedInbox;