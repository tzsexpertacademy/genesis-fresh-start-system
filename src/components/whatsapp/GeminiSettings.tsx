import React, { useState, useEffect, memo } from 'react';
import ComponentCard from '../common/ComponentCard';
import Switch from '../common/Switch';

// Constants for cache management
const PROMPT_CACHE_KEY = 'gemini_system_prompt';
const CACHE_TIMESTAMP_KEY = 'gemini_cache_timestamp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface GeminiModel {
  name: string;
  value: string;
}

interface GeminiConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
  instructions: string;
  autoReplyEnabled: boolean;
  autoReplyTrigger: string;
  customModels?: GeminiModel[];
}

const GeminiSettings: React.FC = () => {
  const [config, setConfig] = useState<GeminiConfig>({
    enabled: false,
    apiKey: '',
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
    instructions: '',
    autoReplyEnabled: false,
    autoReplyTrigger: '!ai',
    customModels: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper function to check if cache is valid (less than 24 hours old)
  const isCacheValid = () => {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;

    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();

    return now - cacheTime < ONE_DAY_MS;
  };

  // Helper function to save prompt to cache with timestamp
  const savePromptToCache = (prompt: string) => {
    try {
      localStorage.setItem(PROMPT_CACHE_KEY, prompt);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Saved system prompt to cache with timestamp');
    } catch (error) {
      console.error('Error saving system prompt to cache:', error);
    }
  };

  // Helper function to load prompt from cache
  const loadPromptFromCache = () => {
    try {
      // Only load if cache is valid (less than 24 hours old)
      if (isCacheValid()) {
        const prompt = localStorage.getItem(PROMPT_CACHE_KEY);
        return prompt || '';
      }
      return '';
    } catch (error) {
      console.error('Error loading system prompt from cache:', error);
      return '';
    }
  };

  // Helper function to clear expired cache
  const clearExpiredCache = () => {
    if (!isCacheValid()) {
      localStorage.removeItem(PROMPT_CACHE_KEY);
      console.log('Cleared expired system prompt cache (older than 24 hours)');
    }
  };

  // Fetch configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        clearExpiredCache();

        // Mock response for now - simulate successful load
        const response = { status: true, data: { config: { ...config } } };

        if (response && response.status) {
          if (response.data && response.data.config) {
            const newConfig = response.data.config;
            
            const savedEnabledState = localStorage.getItem('gemini_enabled_state');
            const shouldBeEnabled = savedEnabledState !== null ?
              savedEnabledState === 'true' :
              newConfig.enabled;

            const cachedPrompt = loadPromptFromCache();
            if (cachedPrompt && (!newConfig.instructions || newConfig.instructions === '')) {
              newConfig.instructions = cachedPrompt;
            } else if (newConfig.instructions) {
              savePromptToCache(newConfig.instructions);
            }

            setConfig({
              ...newConfig,
              enabled: shouldBeEnabled,
              apiKey: newConfig.apiKey || ''
            });
          }
        } else {
          setError('Failed to load Gemini configuration');
        }
      } catch (error: any) {
        console.error('Error fetching Gemini settings:', error);
        setError(error.message || 'Failed to load Gemini configuration');
        
        const cachedPrompt = loadPromptFromCache();
        if (cachedPrompt) {
          setConfig(prev => ({
            ...prev,
            instructions: cachedPrompt
          }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      if (name === 'apiKey' && error) {
        setError(null);
        setTestResult(null);
      }

      if (name === 'instructions' && value) {
        savePromptToCache(value);
      }

      const safeValue = name === 'apiKey' ? (value || '') : value;

      setConfig(prev => ({
        ...prev,
        [name]: name === 'temperature' || name === 'topK' || name === 'topP' || name === 'maxOutputTokens' 
          ? Number(safeValue) 
          : safeValue,
      }));
    }
  };

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    if (name === 'enabled') {
      localStorage.setItem('gemini_enabled_state', checked.toString());
    }

    setConfig(prev => ({
      ...prev,
      [name]: checked,
    }));

    // Auto-save for enabled switch
    if (name === 'enabled') {
      // Auto-save logic would go here
    }
  };

  // Save configuration
  const handleSave = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setTestResult({
      success: true,
      message: 'Saving settings...'
    });

    try {
      setSaving(true);
      setError(null);

      const currentEnabled = config.enabled;
      localStorage.setItem('gemini_enabled_state', currentEnabled.toString());

      const configToSave = {
        ...config,
        enabled: currentEnabled,
        apiKey: config.apiKey || '',
      };

      if (configToSave.instructions) {
        savePromptToCache(configToSave.instructions);
      }

      // Mock save for now
      const response = { status: true, data: { config: configToSave } };

      if (response.status) {
        if (response.data && response.data.config) {
          const savedEnabledState = localStorage.getItem('gemini_enabled_state');
          const shouldBeEnabled = savedEnabledState === 'true';

          const newConfig = {
            ...response.data.config,
            enabled: shouldBeEnabled,
            apiKey: response.data.config.apiKey || ''
          };

          setConfig(newConfig);
        }

        setTestResult({
          success: true,
          message: '✅ Settings saved successfully!'
        });

        setTimeout(() => {
          setTestResult(null);
        }, 3000);
      } else {
        setError('Failed to save Gemini configuration: Unknown error');
        setTestResult({
          success: false,
          message: 'Failed to save settings: Unknown error'
        });
      }
    } catch (error: any) {
      console.error('Error saving Gemini configuration:', error);
      setError(error.message || 'Failed to save Gemini configuration');
      setTestResult({
        success: false,
        message: 'Error saving settings: ' + (error.message || 'Unknown error')
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset conversation history
  const handleResetHistory = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!window.confirm('Are you sure you want to reset the conversation history? This will clear all previous messages.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      setTestResult({
        success: true,
        message: 'Resetting conversation history...'
      });

      // Mock reset for now
      const response = { status: true };

      if (response.status) {
        setConfig(prev => ({
          ...prev,
          history: [],
        }));

        setTestResult({
          success: true,
          message: '✅ Conversation history has been reset!'
        });

        setTimeout(() => {
          setTestResult(null);
        }, 3000);
      } else {
        setError('Failed to reset conversation history: Unknown error');
      }
    } catch (error: any) {
      console.error('Error resetting conversation history:', error);
      setError(error.message || 'Failed to reset conversation history');
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      setTesting(true);
      setTestResult(null);
      setError(null);

      // Mock test for now
      const response = { status: true, data: { response: 'Test successful!' } };

      if (response.status) {
        setTestResult({
          success: true,
          message: 'Connection successful! Response: ' + response.data.response
        });
      } else {
        setTestResult({
          success: false,
          message: 'Connection failed: Unknown error'
        });
      }
    } catch (error: any) {
      console.error('Error testing Gemini connection:', error);
      setTestResult({
        success: false,
        message: 'Connection failed: ' + (error.message || 'Unknown error')
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <ComponentCard title="Gemini AI Settings">
        <div className="flex justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Gemini AI Settings">
      <div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {testResult && (
          <div className={`mb-4 p-3 rounded-md ${
            testResult.success
              ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {testResult.message}
          </div>
        )}

        <div className="space-y-6">
          {/* Enable Gemini */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Enable Gemini AI</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable or disable Gemini AI integration
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onChange={(checked) => handleSwitchChange('enabled', checked)}
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-800 dark:text-white/90">
              Gemini Model
            </label>
            <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
              Gemini 2.0 Flash
            </div>
            <input type="hidden" name="model" value="gemini-2.0-flash" />
          </div>

          {/* System Instructions */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-800 dark:text-white/90">
              System Instructions
            </label>
            <textarea
              name="instructions"
              value={config.instructions || ''}
              onChange={handleChange}
              placeholder="Enter system instructions for Gemini AI"
              className="w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 focus:border-brand-500 focus:ring-0 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
              rows={5}
            />
            <div className="mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Define how Gemini AI should behave and respond. These instructions will guide the AI's responses.
              </p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const examplePrompt = 'Kamu adalah Ori, seorang yang berbicara bahasa Indonesia, berpikir kritis, menghargai solusi praktis, tidak suka basa-basi berlebihan, paham teknologi, menghargai komunikasi jujur, suka meledek fans Manchester United, dan tahu tentang Manchester United F.C. Selalu jawab dalam bahasa Indonesia.';

                    setConfig(prev => ({
                      ...prev,
                      instructions: examplePrompt
                    }));

                    savePromptToCache(examplePrompt);
                  }}
                  className="text-xs text-brand-500 hover:text-brand-600 underline"
                >
                  Use Example Prompt
                </button>
              </div>
            </div>
          </div>

          {/* Conversation History Management */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">Conversation History</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Reset the conversation history to start fresh
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetHistory}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset History
              </button>
            </div>
          </div>

          {/* Auto Reply Settings */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90 mb-4">Auto Reply Settings</h3>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">Enable Auto Reply</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically respond to all incoming WhatsApp messages
                </p>
              </div>
              <Switch
                checked={config.autoReplyEnabled}
                onChange={(checked) => handleSwitchChange('autoReplyEnabled', checked)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !config.enabled}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
};

export default memo(GeminiSettings);