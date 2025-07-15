import { useState } from 'react';

const SimpleInbox = () => {
  const [contacts] = useState([
    {
      id: '1',
      name: 'João Silva',
      number: '+5511999999999',
      lastMessage: 'Olá, como você está?',
      timestamp: new Date().toISOString(),
      unreadCount: 1
    },
    {
      id: '2', 
      name: 'Maria Santos',
      number: '+5511888888888',
      lastMessage: 'Obrigada pela informação!',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      unreadCount: 0
    }
  ]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">WhatsApp Inbox</h2>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{contact.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{contact.lastMessage}</p>
              </div>
              {contact.unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {contact.unreadCount}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleInbox;