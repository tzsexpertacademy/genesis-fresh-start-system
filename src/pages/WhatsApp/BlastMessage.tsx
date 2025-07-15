import { useState } from 'react';
import PageMeta from '../../components/common/PageMeta';

const BlastMessage = () => {
  const [message, setMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  const contacts = [
    { id: '1', name: 'João Silva', number: '+5511999999999' },
    { id: '2', name: 'Maria Santos', number: '+5511888888888' }
  ];

  const handleSend = async () => {
    console.log('Sending message:', message, 'to contacts:', selectedContacts);
    // Mock sending logic
  };

  return (
    <>
      <PageMeta title="Blast Message - WhatsApp" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Enviar Mensagem em Massa</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Digite sua mensagem..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Contatos</label>
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <label key={contact.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContacts([...selectedContacts, contact.id]);
                        } else {
                          setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{contact.name} ({contact.number})</span>
                  </label>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              disabled={!message || selectedContacts.length === 0}
            >
              Enviar Mensagem
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlastMessage;