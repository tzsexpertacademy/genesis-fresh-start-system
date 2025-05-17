import { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../../services/whatsappService';

interface Config {
  autoReply: {
    enabled: boolean;
    message: string;
  };
  limits: {
    maxMessages: number;
    maxMediaSize: number;
  };
  blocklist: string[];
}

const SettingsForm = () => {
  const [config, setConfig] = useState<Config>({
    autoReply: {
      enabled: false,
      message: '',
    },
    limits: {
      maxMessages: 100,
      maxMediaSize: 5 * 1024 * 1024,
    },
    blocklist: [],
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newBlockedNumber, setNewBlockedNumber] = useState<string>('');

  // Fetch configuration
  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getConfig();
      if (response.status) {
        setConfig(response.data.config);
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
      setError(error.message || 'Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await updateConfig(config);
      if (response.status) {
        setSuccess('Configuration saved successfully');
        setConfig(response.data.config);
      }
    } catch (error: any) {
      console.error('Error saving config:', error);
      setError(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfig();
  };

  // Handle auto-reply toggle
  const handleAutoReplyToggle = () => {
    setConfig({
      ...config,
      autoReply: {
        ...config.autoReply,
        enabled: !config.autoReply.enabled,
      },
    });
  };

  // Handle auto-reply message change
  const handleAutoReplyMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfig({
      ...config,
      autoReply: {
        ...config.autoReply,
        message: e.target.value,
      },
    });
  };

  // Handle max messages change
  const handleMaxMessagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setConfig({
        ...config,
        limits: {
          ...config.limits,
          maxMessages: value,
        },
      });
    }
  };

  // Handle max media size change
  const handleMaxMediaSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setConfig({
        ...config,
        limits: {
          ...config.limits,
          maxMediaSize: value * 1024 * 1024, // Convert MB to bytes
        },
      });
    }
  };

  // Add number to blocklist
  const addToBlocklist = () => {
    if (!newBlockedNumber) return;
    
    // Validate number
    if (!/^\d+$/.test(newBlockedNumber)) {
      setError('Invalid phone number format. Use country code without + (e.g., 62812345678)');
      return;
    }
    
    // Check if already in blocklist
    if (config.blocklist.includes(newBlockedNumber)) {
      setError('This number is already in the blocklist');
      return;
    }
    
    setConfig({
      ...config,
      blocklist: [...config.blocklist, newBlockedNumber],
    });
    
    setNewBlockedNumber('');
    setError(null);
  };

  // Remove number from blocklist
  const removeFromBlocklist = (number: string) => {
    setConfig({
      ...config,
      blocklist: config.blocklist.filter((n) => n !== number),
    });
  };

  // Fetch config on component mount
  useEffect(() => {
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default p-6.5">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="border-b border-stroke py-4 px-6.5">
        <h3 className="font-semibold text-black">WhatsApp Gateway Settings</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6.5">
        {error && (
          <div className="mb-4 rounded-md bg-danger-light py-3 px-4">
            <div className="flex items-center">
              <span className="text-danger">{error}</span>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 rounded-md bg-success-light py-3 px-4">
            <div className="flex items-center">
              <span className="text-success">{success}</span>
            </div>
          </div>
        )}
        
        <div className="mb-4.5">
          <h4 className="text-lg font-semibold text-black mb-2.5">Auto-Reply Settings</h4>
          
          <div className="flex items-center mb-4">
            <label className="flex cursor-pointer select-none items-center">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={config.autoReply.enabled}
                  onChange={handleAutoReplyToggle}
                  className="sr-only"
                />
                <div className={`block h-8 w-14 rounded-full ${
                  config.autoReply.enabled ? 'bg-primary' : 'bg-gray-3'
                }`}></div>
                <div className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition ${
                  config.autoReply.enabled ? 'translate-x-6' : ''
                }`}></div>
              </div>
              <span className="ml-3 font-medium">Enable Auto-Reply</span>
            </label>
          </div>
          
          <div className="mb-4.5">
            <label className="mb-2.5 block text-black">Auto-Reply Message</label>
            <textarea
              rows={3}
              placeholder="Enter auto-reply message..."
              value={config.autoReply.message}
              onChange={handleAutoReplyMessageChange}
              disabled={!config.autoReply.enabled}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter"
            ></textarea>
          </div>
        </div>
        
        <div className="mb-4.5">
          <h4 className="text-lg font-semibold text-black mb-2.5">Limits</h4>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2.5 block text-black">Max Messages per Day</label>
              <input
                type="number"
                min="1"
                value={config.limits.maxMessages}
                onChange={handleMaxMessagesChange}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary"
              />
            </div>
            
            <div>
              <label className="mb-2.5 block text-black">Max Media Size (MB)</label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.limits.maxMediaSize / (1024 * 1024)}
                onChange={handleMaxMediaSizeChange}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-4.5">
          <h4 className="text-lg font-semibold text-black mb-2.5">Blocklist</h4>
          
          <div className="flex mb-4">
            <input
              type="text"
              placeholder="Enter phone number to block..."
              value={newBlockedNumber}
              onChange={(e) => setNewBlockedNumber(e.target.value)}
              className="w-full rounded-l border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary"
            />
            <button
              type="button"
              onClick={addToBlocklist}
              className="flex items-center justify-center rounded-r bg-primary px-6 font-medium text-white hover:bg-opacity-90"
            >
              Add
            </button>
          </div>
          
          <div className="border border-stroke rounded-sm">
            {config.blocklist.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No blocked numbers</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke">
                {config.blocklist.map((number) => (
                  <li key={number} className="flex items-center justify-between p-3">
                    <span>{number}</span>
                    <button
                      type="button"
                      onClick={() => removeFromBlocklist(number)}
                      className="text-danger hover:text-opacity-80"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <button
          type="submit"
          disabled={saving}
          className="flex w-full justify-center rounded bg-primary p-3 font-medium text-white transition hover:bg-opacity-90 disabled:bg-opacity-70"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default SettingsForm;
