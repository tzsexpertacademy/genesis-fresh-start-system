import { useState } from 'react';
import { PageMeta } from '../../components/common/PageMeta';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const GeminiAI = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    // Mock response
    setTimeout(() => {
      setResponse(`Resposta simulada para: "${prompt}"`);
      setLoading(false);
    }, 1000);
  };

  return (
    <>
      <PageMeta title="Gemini AI - WhatsApp" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Gemini AI Assistant</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Digite seu prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Faça uma pergunta ou digite um comando..."
              />
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Enviar'}
            </button>
            
            {response && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium mb-2">Resposta:</h3>
                <ReactMarkdown 
                  className="prose dark:prose-invert max-w-none" 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ children, ...props }) => {
                      return (
                        <code 
                          className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {response}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GeminiAI;