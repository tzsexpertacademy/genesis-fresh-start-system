import React, { useState, useEffect, memo } from 'react';
import { getGeminiConfig, updateGeminiConfig, testGeminiConnection } from '../../services/geminiService';
import ComponentCard from '../../components/common/ComponentCard';
import { stateManager } from '../../utils/stateManager';
import ErrorBoundary from '../../components/common/ErrorBoundary';

const PROMPT_CACHE_KEY = 'geminiSpecificInstructions_cache'; // Specific cache for Gemini
const CACHE_TIMESTAMP_KEY = 'ai_settings_cache_timestamp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface GeminiProviderConfig {
  apiKey?: string; // Display only, not editable here
  model?: string; // Display only, fixed model
  geminiSpecificInstructions?: string;
  // Other fields from full config that we might need to pass through or preserve
  enabled?: boolean;
  activeAIProvider?: string;
  instructions?: string;
  openaiSpecificInstructions?: string;
  groqSpecificInstructions?: string;
  [key: string]: any;
}

const GeminiProviderSettings: React.FC = () => {
  const [config, setConfig] = useState<GeminiProviderConfig>({
    geminiSpecificInstructions: '',
    model: 'gemini-2.0-flash', // Fixed model
  });
  const [apiKeyIsSet, setApiKeyIsSet] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  // Removed validatingApiKey and apiKeyValidationResult states
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
    catch (e) { console.error('Error saving Gemini prompt to cache:', e); }
  };

  const loadPromptFromCache = () => {
    try { if (isCacheValid()) return localStorage.getItem(PROMPT_CACHE_KEY) || ''; return ''; }
    catch (e) { console.error('Error loading Gemini prompt from cache:', e); return ''; }
  };

  const clearExpiredCache = () => {
    if (!isCacheValid()) {
      localStorage.removeItem(PROMPT_CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY); // Assuming this is shared, might need care if other pages use it differently
      console.log('Cleared expired Gemini provider settings cache');
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
        const response = await getGeminiConfig(); // Fetches the full AI config
        if (!isMounted) return;

        if (response?.status && response.data?.config) {
          const serverConfig = response.data.config;
          setConfig(prev => ({
            ...prev, // Keep local state for fields not in serverConfig
            ...serverConfig, // Overwrite with server config
            geminiSpecificInstructions: serverConfig.geminiSpecificInstructions || loadPromptFromCache() || '',
            model: serverConfig.model || 'gemini-2.0-flash', // Ensure model is set
          }));
          // API key for Gemini is process.env.GEMINI_API_KEY, check its presence
          // The backend's getGeminiConfig should ideally return a flag like `geminiApiKeySet: true/false`
          // For now, we assume if config.apiKey is not '****' or empty, it's set.
          // A better approach is for the backend to explicitly tell if the .env key is set.
          // Let's assume the backend now sends `geminiApiKeySet` (or similar) in the config object.
          setApiKeyIsSet(!!serverConfig.apiKey && serverConfig.apiKey !== '****');


          if (serverConfig.geminiSpecificInstructions && serverConfig.geminiSpecificInstructions !== loadPromptFromCache()) {
            savePromptToCache(serverConfig.geminiSpecificInstructions);
          }
        } else {
          setError('Failed to load Gemini configuration: ' + (response?.message || 'Unknown error'));
          setConfig(prev => ({ ...prev, geminiSpecificInstructions: loadPromptFromCache() }));
        }
      } catch (error: any) {
        if (!isMounted) return;
        setError(error.message || 'Failed to load Gemini configuration');
        setConfig(prev => ({ ...prev, geminiSpecificInstructions: loadPromptFromCache() }));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchConfigData();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    if (name === 'geminiSpecificInstructions') savePromptToCache(value);
  };

  const handleSave = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setTestResult({ success: true, message: 'Saving Gemini settings...' });
    setSaving(true);
    setError(null);
    stateManager.setProcessing(true);

    try {
      const dataToSave = {
        geminiSpecificInstructions: config.geminiSpecificInstructions,
      };
      const response = await updateGeminiConfig(dataToSave);

      if (response.status) {
        if (response.data?.config) {
             setConfig(prev => ({ ...prev, ...response.data.config, geminiSpecificInstructions: dataToSave.geminiSpecificInstructions }));
        }
        setTestResult({ success: true, message: '✅ Gemini settings saved successfully!' });
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
  
  // handleValidateApiKey function removed

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    stateManager.setProcessing(true);
    try {
      const response = await testGeminiConnection();
      if (response.status) {
        setTestResult({ success: true, message: 'Gemini connection successful! Response: ' + response.data.response });
      } else {
        setTestResult({ success: false, message: 'Gemini connection failed: ' + response.message });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: 'Connection test failed: ' + (error.message || 'Unknown error') });
    } finally {
      stateManager.setProcessing(false);
      setTesting(false);
    }
  };

  if (loading) {
    return <ComponentCard title="Gemini Provider Settings"><div className="flex justify-center p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div></ComponentCard>;
  }

  return (
    <ComponentCard title="Gemini Provider Settings">
      <div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400">{error}</div>}
        {testResult && <div className={`mb-4 p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>{testResult.message}</div>}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* API Key Status section removed */}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The Gemini API Key (<code>GEMINI_API_KEY</code>) must be configured in the backend's <code>.env</code> file.
          </p>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white/90">Gemini Model</label>
            <input
              type="text"
              value={config.model || 'gemini-2.0-flash'}
              readOnly
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Gemini Specific System Instructions</label>
            <textarea
              name="geminiSpecificInstructions"
              value={config.geminiSpecificInstructions || ''}
              onChange={handleChange}
              placeholder="Enter system instructions specifically for Gemini..."
              className="w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 focus:border-brand-500 focus:ring-0 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
              rows={5}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">If empty, the Global System Instructions will be used for Gemini.</p>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !apiKeyIsSet}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Gemini Connection'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Gemini Settings'}
            </button>
          </div>
        </form>
      </div>
    </ComponentCard>
  );
};

const GeminiProviderSettingsWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <GeminiProviderSettings />
  </ErrorBoundary>
);
export default memo(GeminiProviderSettingsWithErrorBoundary);