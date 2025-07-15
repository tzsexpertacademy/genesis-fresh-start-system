import { useState } from 'react';
import PageMeta from '../../components/common/PageMeta';

const GroqChat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: 'user' | 'bot'}>>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user' as const
    };
    
    setMessages([...messages, newMessage]);
    setMessage('');
  };

  return (
    <>
      <PageMeta title="Groq Chat - WhatsApp" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[600px] flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Groq AI Chat</h2>
          
          <div className="flex-1 overflow-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center">Inicie uma conversa...</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg ${
                      msg.sender === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GroqChat;