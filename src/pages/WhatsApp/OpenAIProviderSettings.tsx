import React, { useState, useEffect, memo } from 'react';
import { getGeminiConfig, updateGeminiConfig } from '../../services/geminiService'; // Using geminiService as the central AI config manager
// import { testOpenAIConnection } from '../../services/openaiService'; // Placeholder for OpenAI test connection
import ComponentCard from '../../components/common/ComponentCard';
import stateManager from '../../utils/stateManager';
import ErrorBoundary from '../../components/common/ErrorBoundary';

const PROMPT_CACHE_KEY = 'openaiSpecificInstructions_cache';
const CACHE_TIMESTAMP_KEY = 'ai_settings_cache_timestamp'; // Shared timestamp for simplicity
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface OpenAIProviderConfig {
  apiKeySet?: boolean; // Display only, from backend .env check
  model?: string;      // Display only, from backend config
  openaiSpecificInstructions?: string;
  // Fields to preserve from the global AI config
  enabled?: boolean;
  activeAIProvider?: string;
  instructions?: string; // Global instructions
  geminiSpecificInstructions?: string;
  groqSpecificInstructions?: string;
  [key: string]: any;
}

const OpenAIProviderSettings: React.FC = () => {
  const [config, setConfig] = useState<OpenAIProviderConfig>({
    openaiSpecificInstructions: '',
    model: 'gpt-3.5-turbo', // Default display, will be updated from backend
  });
  const [apiKeyIsSet, setApiKeyIsSet] = useState<boolean>(false); // Specifically for OpenAI
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false); // For a potential test connection button
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCacheValid = () => {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    const cacheTime = parseInt(timestamp, 10);
    return Date.now() - cacheTime < ONE_DAY_MS;
  };

  const savePromptToCache = (prompt: string) => {
    try { localStorage.setItem(PROMPT_CACHE_KEY, prompt); localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString()); }
    catch (e) { console.error('Error saving OpenAI prompt to cache:', e); }
  };

  const loadPromptFromCache = () => {
    try { if (isCacheValid()) return localStorage.getItem(PROMPT_CACHE_KEY) || ''; return ''; }
    catch (e) { console.error('Error loading OpenAI prompt from cache:', e); return ''; }
  };
  
  const clearExpiredCache = () => {
    if (!isCacheValid()) {
      localStorage.removeItem(PROMPT_CACHE_KEY);
      // Only remove specific cache, not the shared timestamp unless managed globally
      console.log('Cleared expired OpenAI provider settings cache');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchConfigData = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      clearExpiredCache();

      try {
        // Fetch the global AI config which now includes OpenAI settings
        const response = await getGeminiConfig(); 
        if (!isMounted) return;

        if (response?.status && response.data?.config) {
          const serverConfig = response.data.config;
          setConfig(prev => ({
            ...prev, // Keep local state for fields not in serverConfig
            ...serverConfig, // Overwrite with server config
            openaiSpecificInstructions: serverConfig.openaiSpecificInstructions || loadPromptFromCache() || '',
            model: serverConfig.openaiModel || 'gpt-3.5-turbo', // Use openaiModel from global config
          }));
          setApiKeyIsSet(!!serverConfig.openaiApiKeySet); // Status from global config

          if (serverConfig.openaiSpecificInstructions && serverConfig.openaiSpecificInstructions !== loadPromptFromCache()) {
            savePromptToCache(serverConfig.openaiSpecificInstructions);
          }
        } else {
          setError('Failed to load AI configuration: ' + (response?.message || 'Unknown error'));
          setConfig(prev => ({ ...prev, openaiSpecificInstructions: loadPromptFromCache() }));
        }
      } catch (error: any) {
        if (!isMounted) return;
        setError(error.message || 'Failed to load AI configuration');
         setConfig(prev => ({ ...prev, openaiSpecificInstructions: loadPromptFromCache() }));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchConfigData();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    if (name === 'openaiSpecificInstructions') savePromptToCache(value);
  };

  const handleSave = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setTestResult({ success: true, message: 'Saving OpenAI settings...' });
    setSaving(true);
    setError(null);
    stateManager.setProcessing(true);

    try {
      // Only send OpenAI-specific instructions to the update endpoint
      const dataToSave = {
        openaiSpecificInstructions: config.openaiSpecificInstructions,
        // If you add editable model selection for OpenAI later, include it here:
        // openaiModel: config.openaiModel 
      };
      
      // updateGeminiConfig is used as it's the central AI config update endpoint
      const response = await updateGeminiConfig(dataToSave); 

      if (response.status) {
         if (response.data?.config) {
             // Update local state with the full refreshed config from backend
             setConfig(prev => ({ 
                ...prev, 
                ...response.data.config, 
                openaiSpecificInstructions: dataToSave.openaiSpecificInstructions // Ensure our change is reflected
            }));
        }
        setTestResult({ success: true, message: '✅ OpenAI settings saved successfully!' });
        setTimeout(() => setTestResult(null), 3000);
      } else {
        setError('Failed to save settings: ' + (response.message || 'Unknown error'));
        setTestResult({ success: false, message: 'Failed to save settings: ' + (response.message || 'Unknown error') });
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save settings');
      setTestResult({ success: false, message: 'Error saving settings: ' + (error.message || 'Unknown error') });
    } finally {
      stateManager.setProcessing(false);
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    stateManager.setProcessing(true);
    try {
      // Placeholder: Implement testOpenAIConnection in openaiService.ts and backend
      // const response = await testOpenAIConnection(); 
      // For now, simulate:
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setTestResult({ success: true, message: 'OpenAI connection test successful! (Simulated)' });
      console.warn("Test connection for OpenAI is not fully implemented yet. This is a simulated success.");
    } catch (error: any) {
      setTestResult({ success: false, message: 'Connection test failed: ' + (error.message || 'Unknown error') });
    } finally {
      stateManager.setProcessing(false);
      setTesting(false);
    }
  };
  
  if (loading) {
    return <ComponentCard title="OpenAI Provider Settings"><div className="flex justify-center p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div></ComponentCard>;
  }

  return (
    <ComponentCard title="OpenAI Provider Settings">
      <div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400">{error}</div>}
        {testResult && <div className={`mb-4 p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>{testResult.message}</div>}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* API Key Status section removed */}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The OpenAI API Key (<code>OPENAI_API_KEY</code>) must be configured in the backend's <code>.env</code> file.
          </p>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white/90">OpenAI Model</label>
            <input
              type="text"
              value={config.model || 'gpt-3.5-turbo'} // Display the model from config
              readOnly
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
            />
             <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Model used for OpenAI. Currently fixed in backend, can be made configurable if needed.</p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-800 dark:text-white/90">OpenAI Specific System Instructions</label>
            <textarea
              name="openaiSpecificInstructions"
              value={config.openaiSpecificInstructions || ''}
              onChange={handleChange}
              placeholder="Enter system instructions specifically for OpenAI..."
              className="w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 focus:border-brand-500 focus:ring-0 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
              rows={5}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">If empty, the Global System Instructions will be used for OpenAI.</p>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !apiKeyIsSet} // Disable if API key not set
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test OpenAI Connection'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save OpenAI Settings'}
            </button>
          </div>
        </form>
      </div>
    </ComponentCard>
  );
};

const OpenAIProviderSettingsWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <OpenAIProviderSettings />
  </ErrorBoundary>
);
export default memo(OpenAIProviderSettingsWithErrorBoundary);