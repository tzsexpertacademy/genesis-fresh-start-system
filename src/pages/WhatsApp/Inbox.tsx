import PageMeta from '../../components/common/PageMeta';
import SimpleInbox from '../../components/whatsapp/SimpleInbox';

const Inbox = () => {
  return (
    <>
      <PageMeta title="Inbox - WhatsApp" />
      
      <div className="container mx-auto px-4 py-6">
        <SimpleInbox />
      </div>
    </>
  );
};

export default Inbox;