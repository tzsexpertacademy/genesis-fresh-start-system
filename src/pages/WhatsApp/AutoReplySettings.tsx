import React, { useState, useEffect, memo } from 'react';
import ComponentCard from '../../components/common/ComponentCard';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { getGeminiConfig, updateGeminiConfig } from '../../services/geminiService'; // Central AI config service
import Switch from '../../components/common/Switch';
import PageMeta from '../../components/common/PageMeta';
import { Link } from 'react-router-dom';

interface AIConfig {
  enabled: boolean; // This will be our main toggle for AI-powered auto-reply
  activeAIProvider: 'gemini' | 'openai' | 'groq' | string; // Store the selected provider
  // Include other fields from the global config to preserve them on save
  instructions?: string;
  geminiSpecificInstructions?: string;
  openaiSpecificInstructions?: string;
  groqSpecificInstructions?: string;
  model?: string; // Gemini model
  openaiModel?: string;
  groqModel?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  // Fields related to API key status (read-only from backend)
  apiKey?: string; // Gemini API Key from .env (not directly used/set by this page)
  openaiApiKeySet?: boolean;
  groqApiKeySet?: boolean;
}

const AutoReplySettings: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    activeAIProvider: 'gemini', // Default to Gemini
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getGeminiConfig();
        if (!isMounted) return;
        if (response?.status && response.data?.config) {
          const serverConfig = response.data.config;
          setConfig(prev => ({
            ...prev, // Keep local defaults if server doesn't provide
            ...serverConfig, // Overwrite with server config
            enabled: serverConfig.enabled !== undefined ? serverConfig.enabled : false,
            activeAIProvider: serverConfig.activeAIProvider || 'gemini',
          }));
        } else {
          setError('Failed to load AI configuration: ' + (response?.message || 'Unknown error'));
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load AI configuration');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchConfig();
    return () => { isMounted = false; };
  }, []);

  const handleToggleChange = (newEnabledState: boolean) => {
    setConfig(prev => ({ ...prev, enabled: newEnabledState }));
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(prev => ({ ...prev, activeAIProvider: e.target.value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // We only want to save 'enabled' and 'activeAIProvider' from this page.
      // Other settings are managed on their respective provider settings pages or are global.
      const settingsToUpdate = {
        enabled: config.enabled,
        activeAIProvider: config.activeAIProvider,
      };
      
      const response = await updateGeminiConfig(settingsToUpdate);

      if (response.status) {
        if (response.data?.config) {
             setConfig(prev => ({ ...prev, ...response.data.config }));
        }
        setSuccessMessage('Auto-reply settings saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to save settings: ' + (response.message || 'Unknown error'));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <ComponentCard title="WhatsApp Auto-Reply Settings">
        <div className="flex justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </ComponentCard>
    );
  }

  return (
    <>
      <PageMeta title="WhatsApp Auto-Reply Settings" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h2 className="text-title-md2 font-bold text-black dark:text-white">
            WhatsApp Auto-Reply / Chatbot Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure automatic AI-powered replies for incoming WhatsApp messages.
          </p>
        </div>

        <ComponentCard>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400">{error}</div>}
          {successMessage && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-md dark:bg-green-500/10 dark:text-green-400">{successMessage}</div>}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Enable/Disable Auto-Reply */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Enable AI Auto-Reply</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If enabled, the selected AI will respond to all incoming WhatsApp messages.
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onChange={handleToggleChange}
              />
            </div>

            {/* AI Provider Selection */}
            <div>
              <label htmlFor="aiProvider" className="block mb-2 text-sm font-medium text-gray-800 dark:text-white/90">
                Select AI Provider for Auto-Reply
              </label>
              <select
                id="aiProvider"
                name="activeAIProvider"
                value={config.activeAIProvider}
                onChange={handleProviderChange}
                className="w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 focus:border-brand-500 focus:ring-0 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                disabled={!config.enabled}
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The selected AI will be used for automatic replies. Ensure the chosen provider is correctly configured.
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Provider Configuration</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                    System instructions and other specific settings for each AI provider (Gemini, OpenAI, Groq) can be configured on their respective settings pages:
                </p>
                <ul className="list-disc list-inside text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5">
                    <li><Link to="/whatsapp/ai-settings/gemini" className="hover:underline">Gemini Settings</Link></li>
                    <li><Link to="/whatsapp/ai-settings/openai" className="hover:underline">OpenAI Settings</Link></li>
                    <li><Link to="/whatsapp/ai-settings/groq" className="hover:underline">Groq Settings</Link></li>
                </ul>
                 <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    The global system instructions will be used if provider-specific instructions are not set. API keys must be set in the backend <code>.env</code> file.
                </p>
            </div>


            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Auto-Reply Settings'}
              </button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
};

const AutoReplySettingsWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <AutoReplySettings />
  </ErrorBoundary>
);

export default memo(AutoReplySettingsWithErrorBoundary);