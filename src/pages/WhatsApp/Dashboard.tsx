import PageMeta from '../../components/common/PageMeta';
import { StatusCard } from '../../components/whatsapp/StatusCard';

const Dashboard = () => {
  return (
    <>
      <PageMeta title="Dashboard - WhatsApp" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatusCard />
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Mensagens Hoje</h3>
            <div className="text-3xl font-bold text-blue-600">0</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Contatos</h3>
            <div className="text-3xl font-bold text-green-600">0</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;