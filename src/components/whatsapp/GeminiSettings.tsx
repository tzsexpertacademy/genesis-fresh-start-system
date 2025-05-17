import React, { useState, useEffect, memo } from 'react';
import { getGeminiConfig, updateGeminiConfig, testGeminiConnection, validateGeminiApiKey } from '../../services/geminiService';
import ComponentCard from '../common/ComponentCard';
import Switch from '../common/Switch';
import stateManager from '../../utils/stateManager';

// Constants for cache management
const PROMPT_CACHE_KEY = 'gemini_system_prompt';
const CACHE_TIMESTAMP_KEY = 'gemini_cache_timestamp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface GeminiModel {
  value: string;
  label: string;
  isCustom?: boolean;
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
  [key: string]: any; // Add index signature to allow dynamic property access
}

const GeminiSettings: React.FC = () => {
  const [config, setConfig] = useState<GeminiConfig>({
    enabled: false,
    apiKey: '',
    model: 'gemini-1.5-pro',
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
  const [validating, setValidating] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModelForm, setShowAddModelForm] = useState<boolean>(false);
  const [newModel, setNewModel] = useState<{ value: string; label: string }>({ value: '', label: '' });

  // Default models - only gemini-2.0-flash is available
  const defaultModels: GeminiModel[] = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ];

  // Combine default and custom models
  const models = [...defaultModels, ...(config.customModels || [])];

  // Replace the document.body class approach with local component styles
  const [isStabilized, setIsStabilized] = useState(false);

  // Instead of manipulating classes on document.body, use component state to stabilize the UI
  const stabilizeUI = () => {
    setIsStabilized(true);
    return () => setIsStabilized(false);
  };

  // Use this style object with the stabilized state
  const componentStyle = {
    transition: isStabilized ? 'none !important' : '',
    animation: isStabilized ? 'none !important' : ''
  };

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

  // Fetch configuration on mount with improved handling and error recovery
  useEffect(() => {
    // Track if component is mounted
    let isMounted = true;

    // Stabilize the UI
    const removeStabilization = stabilizeUI();

    // Reference to the timeout ID for cleanup
    let stabilityTimeoutId: number | null = null;

    const fetchConfig = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        // Clear expired cache first
        clearExpiredCache();

        // Use debouncing with a longer timeout to prevent multiple rapid requests
        if (!stateManager.debounce('gemini_settings_fetch', 15000)) { // Increased to 15 seconds
          console.log('Debouncing Gemini settings fetch');

          // Still set loading to false if we're debouncing
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Set processing state to prevent UI flickering
        stateManager.setProcessing(true);

        const response = await getGeminiConfig();

        if (!isMounted) return;

        if (response && response.status) {
          // Check if this is a fallback response due to connection error
          if (response.message && response.message.includes('connection error')) {
            console.warn('Using fallback Gemini config due to connection error:', response);
            setError('Warning: Using default configuration. Backend server connection error.');
          }

          if (response.data && response.data.config) {
            // Only update if the config is different to prevent unnecessary re-renders
            const newConfig = response.data.config;
            // PERBAIKAN: Cek localStorage untuk status enabled
            const savedEnabledState = localStorage.getItem('gemini_enabled_state');
            console.log('Saved enabled state from localStorage:', savedEnabledState);

            // Jika ada status enabled yang disimpan di localStorage, gunakan itu
            const shouldBeEnabled = savedEnabledState !== null ?
              savedEnabledState === 'true' :
              newConfig.enabled;

            console.log('Should be enabled:', shouldBeEnabled);
            console.log('Config enabled from server:', newConfig.enabled);

            // Check for cached system prompt
            const cachedPrompt = loadPromptFromCache();
            if (cachedPrompt && (!newConfig.instructions || newConfig.instructions === '')) {
              console.log('Using cached system prompt');
              newConfig.instructions = cachedPrompt;
            } else if (newConfig.instructions) {
              // Save the server's system prompt to cache
              savePromptToCache(newConfig.instructions);
            }

            setConfig(prevConfig => {
              // Deep comparison to avoid unnecessary updates
              if (JSON.stringify(prevConfig) === JSON.stringify(newConfig) &&
                  prevConfig.enabled === shouldBeEnabled) {
                return prevConfig; // No change needed
              }

              // Gunakan status enabled yang benar dan pastikan apiKey tidak undefined
              return {
                ...newConfig,
                enabled: shouldBeEnabled,
                apiKey: newConfig.apiKey || ''
              };
            });
          } else {
            console.warn('Invalid Gemini config format:', response);
            setError('Invalid configuration format received');
            // Keep existing config if available
          }
        } else {
          console.warn('Failed to get Gemini config:', response);
          setError('Failed to load Gemini configuration');
          // Keep existing config if available
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Error fetching Gemini settings:', error);

        // Check if this is a connection error
        const isConnectionError = error instanceof TypeError &&
          (error.message.includes('Failed to fetch') ||
           error.message.includes('NetworkError') ||
           error.message.includes('Network request failed') ||
           error.message.includes('ERR_CONNECTION_REFUSED'));

        if (isConnectionError) {
          setError('Backend server connection error. Using default configuration.');
          // Try to load from cache if available
          const cachedPrompt = loadPromptFromCache();
          if (cachedPrompt) {
            setConfig(prev => ({
              ...prev,
              instructions: cachedPrompt
            }));
          }
        } else {
          setError(error.message || 'Failed to load Gemini configuration');
          // Keep existing config if available
        }
      } finally {
        if (!isMounted) return;
        setLoading(false);

        // Clear processing state after a delay
        setTimeout(() => {
          if (isMounted) {
            stateManager.setProcessing(false);
          }
        }, 500);

        // Remove stability after a delay
        stabilityTimeoutId = window.setTimeout(() => {
          if (isMounted) {
            setIsStabilized(false);
          }
        }, 1000);
      }
    };

    // Use a longer timeout before fetching to allow the component to fully mount
    // This helps prevent the flickering issue
    const timeoutId = setTimeout(() => {
      fetchConfig();
    }, 1000); // Increased from 500ms to 1000ms

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);

      // Clear stability timeout if it exists
      if (stabilityTimeoutId !== null) {
        clearTimeout(stabilityTimeoutId);
      }

      // Clean up stabilization
      removeStabilization();

      // Ensure processing state is cleared when component unmounts
      stateManager.setProcessing(false);
    };
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig(prev => ({
        ...prev,
        [name]: checked,
        // Preserve hidden settings
        temperature: prev.temperature,
        topK: prev.topK,
        topP: prev.topP,
        maxOutputTokens: prev.maxOutputTokens,
        instructions: prev.instructions
      }));
    } else {
      // Clear any previous error when changing the API key
      if (name === 'apiKey' && error) {
        setError(null);
        setTestResult(null);
      }

      // Special handling for hidden fields that might still be in the form
      if (name === 'temperature' || name === 'topK' || name === 'topP' ||
          name === 'maxOutputTokens' || name === 'instructions') {
        console.log(`Preserving hidden setting ${name} with value:`, value);

        // Save system instructions to cache when changed
        if (name === 'instructions' && value) {
          savePromptToCache(value);
        }
      }

      // Ensure API key is never undefined
      const safeValue = name === 'apiKey' ? (value || '') : value;

      setConfig(prev => ({
        ...prev,
        [name]: safeValue,
        // Preserve hidden settings except the one being changed
        temperature: name === 'temperature' ? safeValue : prev.temperature,
        topK: name === 'topK' ? safeValue : prev.topK,
        topP: name === 'topP' ? safeValue : prev.topP,
        maxOutputTokens: name === 'maxOutputTokens' ? safeValue : prev.maxOutputTokens,
        instructions: name === 'instructions' ? safeValue : prev.instructions
      }));
    }
  };

  // Handle slider changes with debouncing to prevent flickering
  const handleSliderChange = (name: string, value: number) => {
    // Use a specific debounce key for each slider to prevent cross-interference
    const debounceKey = `slider_${name}`;

    // Only update if we're not debouncing this specific slider
    if (stateManager.debounce(debounceKey, 100)) {
      setConfig(prev => {
        // Only update if the value has changed significantly
        // This prevents tiny changes from causing re-renders
        const threshold = name === 'temperature' || name === 'topP' ? 0.01 : 1;
        if (Math.abs(prev[name] - value) < threshold) {
          return prev; // No significant change, don't update
        }
        return { ...prev, [name]: value };
      });
    }
  };

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    console.log(`Switch ${name} changed to ${checked}`);

    // If this is the enabled switch, handle it specially
    if (name === 'enabled') {
      // First, update localStorage immediately
      localStorage.setItem('gemini_enabled_state', checked.toString());
      console.log('Saved enabled state to localStorage:', checked);

      // Then update the config state
      setConfig(prev => ({
        ...prev,
        enabled: checked,
        // Preserve hidden settings
        temperature: prev.temperature,
        topK: prev.topK,
        topP: prev.topP,
        maxOutputTokens: prev.maxOutputTokens,
        instructions: prev.instructions
      }));

      // Log the change
      console.log(`Updated config with enabled:`, checked);

      // Save the configuration with a slight delay to ensure state is updated
      setTimeout(() => {
        console.log('Auto-saving after enabled change, current state:', checked);
        // Create a special config object for saving
        const configToSave = {
          ...config,
          enabled: checked,
          forceEnabled: true, // Force backend to use our enabled value
        };

        // Call updateGeminiConfig directly instead of handleSave
        updateGeminiConfig(configToSave)
          .then(response => {
            if (response.status) {
              console.log('Successfully saved enabled state:', checked);
            } else {
              console.error('Failed to save enabled state:', response.message);
            }
          })
          .catch(error => {
            console.error('Error saving enabled state:', error);
          });
      }, 300); // Longer delay to ensure state is updated
    } else {
      // For other switches, just update the config
      setConfig(prev => ({
        ...prev,
        [name]: checked,
        // Preserve hidden settings
        temperature: prev.temperature,
        topK: prev.topK,
        topP: prev.topP,
        maxOutputTokens: prev.maxOutputTokens,
        instructions: prev.instructions
      }));

      console.log(`Updated config with ${name}:`, checked);
    }
  };

  // Handle new model input changes
  const handleNewModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewModel(prev => ({ ...prev, [name]: value }));
  };

  // Add new custom model with improved feedback and auto-save
  const handleAddModel = () => {
    if (!newModel.value.trim() || !newModel.label.trim()) {
      setError('Model ID and name are required');
      return;
    }

    // Check if model ID already exists
    if (models.some(model => model.value === newModel.value)) {
      setError('A model with this ID already exists');
      return;
    }

    // Add new model to custom models
    const customModel: GeminiModel = {
      ...newModel,
      isCustom: true
    };

    // Update config with new model
    setConfig(prev => {
      const updatedConfig = {
        ...prev,
        customModels: [...(prev.customModels || []), customModel],
        // Preserve hidden settings
        temperature: prev.temperature,
        topK: prev.topK,
        topP: prev.topP,
        maxOutputTokens: prev.maxOutputTokens,
        instructions: prev.instructions
      };

      // Auto-save the updated configuration
      setTimeout(() => {
        if (!saving) {
          // Use the updated config for saving
          updateGeminiConfig(updatedConfig)
            .then(response => {
              if (response.status) {
                // Show success message
                setTestResult({
                  success: true,
                  message: `Model "${customModel.label}" added successfully!`
                });

                // Clear the message after 3 seconds
                setTimeout(() => {
                  setTestResult(null);
                }, 3000);
              } else {
                setError('Failed to save model: ' + (response.message || 'Unknown error'));
              }
            })
            .catch(error => {
              console.error('Error saving model:', error);
              setError(error.message || 'Failed to save model');
            });
        }
      }, 100);

      return updatedConfig;
    });

    // Reset form
    setNewModel({ value: '', label: '' });
    setShowAddModelForm(false);
    setError(null);

    // Show immediate feedback
    setTestResult({
      success: true,
      message: 'Adding model...'
    });
  };

  // Remove custom model
  const handleRemoveModel = (modelValue: string) => {
    setConfig(prev => ({
      ...prev,
      customModels: (prev.customModels || []).filter(model => model.value !== modelValue),
      // If the current model is being removed, switch to the default model
      model: prev.model === modelValue ? 'gemini-1.5-pro' : prev.model,
      // Preserve hidden settings
      temperature: prev.temperature,
      topK: prev.topK,
      topP: prev.topP,
      maxOutputTokens: prev.maxOutputTokens,
      instructions: prev.instructions
    }));
  };

  // Save configuration with improved feedback and reliability
  const handleSave = async (e?: React.MouseEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();

      // Stop event bubbling
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }

    // Show immediate feedback
    setTestResult({
      success: true,
      message: 'Saving settings...'
    });

    // Set a flag to prevent navigation during save
    const originalBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = (ev) => {
      ev.preventDefault();
      ev.returnValue = '';
      return '';
    };

    // Stabilize the UI
    const removeStabilization = stabilizeUI();

    try {
      setSaving(true);
      setError(null);

      // Save to localStorage first as a backup
      try {
        localStorage.setItem('gemini_config_backup', JSON.stringify(config));
      } catch (storageError) {
        console.warn('Could not save backup to localStorage:', storageError);
      }

      // PERBAIKAN RADIKAL: Pastikan status enabled selalu dikirim dengan benar
      // Simpan status enabled saat ini ke localStorage sebelum menyimpan
      const currentEnabled = config.enabled;
      localStorage.setItem('gemini_enabled_state', currentEnabled.toString());
      console.log('Saved current enabled state to localStorage before save:', currentEnabled);

      // Ensure hidden settings are preserved in the config object
      // This is important since we've hidden these settings from the UI
      // but we still want to save their current values
      const configToSave = {
        ...config,
        // FORCE include enabled state to ensure it's preserved
        enabled: currentEnabled,
        // Add a flag to force the backend to use our enabled value
        forceEnabled: true,
        // Ensure API key is never undefined
        apiKey: config.apiKey || '',
        // Ensure these values are included even though they're not in the UI
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
        instructions: config.instructions
      };

      console.log('FORCE Saving settings with enabled state:', configToSave.enabled);

      // Save system prompt to cache before making API request
      if (configToSave.instructions) {
        savePromptToCache(configToSave.instructions);
      }

      // Make the API request with debounce handling
      const response = await updateGeminiConfig(configToSave);

      if (response.status) {
        // Check if this is a debounced response (which returns the same config)
        const isDebounceResponse = response.message && response.message.includes('being saved');

        if (isDebounceResponse) {
          // This is a debounced response, just show a message but don't update state
          console.log('Received debounced response, maintaining current state');

          // Show a temporary message
          setTestResult({
            success: true,
            message: 'Settings are being processed...'
          });

          // Try again after a short delay
          setTimeout(() => {
            if (!saving) {
              handleSave();
            }
          }, 1500);

          return;
        }

        // PERBAIKAN RADIKAL: Selalu gunakan status enabled dari localStorage
        if (response.data && response.data.config) {
          // Ambil status enabled dari localStorage
          const savedEnabledState = localStorage.getItem('gemini_enabled_state');
          const shouldBeEnabled = savedEnabledState === 'true';

          console.log('Saved enabled state from localStorage:', savedEnabledState);
          console.log('Enabled status in response:', response.data.config.enabled);
          console.log('FORCE using enabled state:', shouldBeEnabled);

          // Buat konfigurasi baru dengan status enabled yang benar dan pastikan apiKey tidak undefined
          const newConfig = {
            ...response.data.config,
            enabled: shouldBeEnabled,
            apiKey: response.data.config.apiKey || ''
          };

          // Update state dengan konfigurasi baru
          setConfig(prevConfig => ({
            ...newConfig,
            // Ensure API key is never undefined
            apiKey: newConfig.apiKey || '',
            // Ensure these values are preserved from the response
            temperature: newConfig.temperature || prevConfig.temperature,
            topK: newConfig.topK || prevConfig.topK,
            topP: newConfig.topP || prevConfig.topP,
            maxOutputTokens: newConfig.maxOutputTokens || prevConfig.maxOutputTokens,
            instructions: newConfig.instructions || prevConfig.instructions
          }));

          console.log('FORCE Updated config state with enabled:', shouldBeEnabled);

          // Simpan kembali ke localStorage untuk memastikan
          localStorage.setItem('gemini_enabled_state', shouldBeEnabled.toString());
        }

        // Kode untuk update localStorage sudah dipindahkan ke atas

        // Show success message with animation
        setTestResult({
          success: true,
          message: '✅ Settings saved successfully!'
        });

        // Clear the message after 3 seconds
        setTimeout(() => {
          setTestResult(null);
        }, 3000);
      } else if (response.message && response.message.includes('Please wait')) {
        // This is a debounce error, show a friendly message
        console.log('Received debounce error, will retry');

        // Show a temporary message
        setTestResult({
          success: true, // Use success style to avoid alarming the user
          message: 'Settings are being saved, please wait...'
        });

        // Try again after a short delay
        setTimeout(() => {
          if (!saving) {
            handleSave();
          }
        }, 1500);
      } else {
        // Real error
        setError('Failed to save Gemini configuration: ' + (response.message || 'Unknown error'));

        // Show error message
        setTestResult({
          success: false,
          message: 'Failed to save settings: ' + (response.message || 'Unknown error')
        });
      }
    } catch (error: any) {
      console.error('Error saving Gemini configuration:', error);
      setError(error.message || 'Failed to save Gemini configuration');

      // Show error message
      setTestResult({
        success: false,
        message: 'Error saving settings: ' + (error.message || 'Unknown error')
      });

      // Try to recover from backup if available
      try {
        const backupConfig = localStorage.getItem('gemini_config_backup');
        if (backupConfig) {
          console.log('Attempting to recover from backup config');
          const parsedBackup = JSON.parse(backupConfig);
          setConfig(parsedBackup);
        }
      } catch (recoveryError) {
        console.error('Could not recover from backup:', recoveryError);
      }
    } finally {
      // Clear the navigation prevention
      window.onbeforeunload = originalBeforeUnload;

      // Clear any session storage flags
      sessionStorage.removeItem('gemini_update_config_in_progress');

      // Remove stability after a delay
      setTimeout(() => {
        removeStabilization();
      }, 500);

      setSaving(false);
    }
  };

  // Validate API key function removed
  const handleValidateApiKey = async (e?: React.MouseEvent) => {
    // Function intentionally left empty
  };

  // Reset conversation history
  const handleResetHistory = async (e?: React.MouseEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();

      // Stop event bubbling
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }

    // Confirm before resetting
    if (!window.confirm('Are you sure you want to reset the conversation history? This will clear all previous messages.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Show immediate feedback
      setTestResult({
        success: true,
        message: 'Resetting conversation history...'
      });

      // Update config with empty history
      const updatedConfig = {
        ...config,
        history: [],
        // Preserve hidden settings
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
        instructions: config.instructions
      };

      // Save the updated config
      const response = await updateGeminiConfig(updatedConfig);

      if (response.status) {
        // Update local state
        setConfig(prev => ({
          ...prev,
          history: [],
          // Preserve hidden settings
          temperature: prev.temperature,
          topK: prev.topK,
          topP: prev.topP,
          maxOutputTokens: prev.maxOutputTokens,
          instructions: prev.instructions
        }));

        // Show success message
        setTestResult({
          success: true,
          message: '✅ Conversation history has been reset!'
        });

        // Clear the message after 3 seconds
        setTimeout(() => {
          setTestResult(null);
        }, 3000);
      } else {
        setError('Failed to reset conversation history: ' + (response.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error resetting conversation history:', error);
      setError(error.message || 'Failed to reset conversation history');
    } finally {
      setSaving(false);
    }
  };

  // Test connection with SPA-friendly approach
  const handleTestConnection = async (e?: React.MouseEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();

      // Stop event bubbling
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }

    // Set a flag to prevent navigation during test
    const originalBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = (ev) => {
      ev.preventDefault();
      ev.returnValue = '';
      return '';
    };

    // Stabilize the UI
    const removeStabilization = stabilizeUI();

    try {
      setTesting(true);
      setTestResult(null);
      setError(null);

      console.log('Testing Gemini connection...');
      const response = await testGeminiConnection();
      console.log('Test response:', response);

      if (response.status) {
        setTestResult({
          success: true,
          message: 'Connection successful! Response: ' + response.data.response
        });
      } else {
        setTestResult({
          success: false,
          message: 'Connection failed: ' + response.message
        });
      }
    } catch (error: any) {
      console.error('Error testing Gemini connection:', error);
      setTestResult({
        success: false,
        message: 'Connection failed: ' + (error.message || 'Unknown error')
      });
    } finally {
      // Clear the navigation prevention
      window.onbeforeunload = originalBeforeUnload;

      // Clear any session storage flags
      sessionStorage.removeItem('gemini_test_in_progress');

      // Remove stability after a delay
      setTimeout(() => {
        removeStabilization();
      }, 500);

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
      <div style={componentStyle}>
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
              onChange={(checked) => {
                console.log('Switch toggle clicked, changing to:', checked);
                handleSwitchChange('enabled', checked);
              }}
            />
          </div>

          {/* Removed API Key section completely */}

          {/* Model Selection - Only gemini-2.0-flash is available */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-800 dark:text-white/90">
                Gemini Model
              </label>
              {/* Removed custom model button since only one model is available */}
            </div>

            {/* Removed custom model form since only one model is available */}

            {/* Display only gemini-2.0-flash model as a disabled input field */}
            <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
              Gemini 2.0 Flash
            </div>
            <input type="hidden" name="model" value="gemini-2.0-flash" />

            {/* Removed custom models list since only one model is available */}
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

                    // Update config with example prompt
                    setConfig(prev => ({
                      ...prev,
                      instructions: examplePrompt
                    }));

                    // Save to cache
                    savePromptToCache(examplePrompt);
                  }}
                  className="text-xs text-brand-500 hover:text-brand-600 underline"
                >
                  Use Example Prompt
                </button>
              </div>
            </div>
          </div>

          {/* Note about other advanced settings */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-blue-500 dark:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">Advanced Settings</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Other advanced settings like temperature, tokens, and max output tokens are managed by the administrator.
                  These settings are optimized for the best performance in Indonesian language responses.
                </p>
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
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Resetting history can help if the AI is stuck in a particular response pattern
            </p>
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

            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-xs text-blue-600 dark:text-blue-300">
                <span className="font-medium">Note:</span> When enabled, Gemini AI will automatically respond to all incoming WhatsApp messages without requiring any trigger word.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !config.enabled || !config.apiKey}
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

// Use memo to prevent unnecessary re-renders
export default memo(GeminiSettings);
