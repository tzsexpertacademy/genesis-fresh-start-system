import { useState, useEffect, useRef } from 'react';
import { getLogs } from '../../services/whatsappService';

interface LogEntry {
  timestamp: string;
  type: string;
  number: string;
  content: string;
}

const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [filter, setFilter] = useState<{
    type: string;
    number: string;
    date: string;
  }>({
    type: '',
    number: '',
    date: '',
  });
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get log type color
  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'sent':
        return 'text-success';
      case 'received':
        return 'text-primary';
      case 'error':
        return 'text-danger';
      default:
        return 'text-black';
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getLogs(100);
      if (response.status) {
        setLogs(response.data.logs || []);
        
        // Scroll to bottom if auto-scroll is enabled
        if (autoRefresh && logContainerRef.current) {
          setTimeout(() => {
            if (logContainerRef.current) {
              logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      setError(error.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter({
      ...filter,
      [name]: value,
    });
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Filter by type
    if (filter.type && log.type !== filter.type) {
      return false;
    }
    
    // Filter by number
    if (filter.number && !log.number.includes(filter.number)) {
      return false;
    }
    
    // Filter by date
    if (filter.date) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate !== filter.date) {
        return false;
      }
    }
    
    return true;
  });

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Fetch logs on component mount and periodically if auto-refresh is enabled
  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="py-6 px-4 md:px-6 xl:px-7.5 flex justify-between items-center border-b border-stroke">
        <h4 className="text-xl font-semibold text-black">WhatsApp Logs</h4>
        <div className="flex items-center space-x-2">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={toggleAutoRefresh}
                className="sr-only"
              />
              <div className={`block h-6 w-10 rounded-full ${
                autoRefresh ? 'bg-primary' : 'bg-gray-3'
              }`}></div>
              <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                autoRefresh ? 'translate-x-4' : ''
              }`}></div>
            </div>
            <span className="ml-2 text-sm">Auto-refresh</span>
          </label>
          <button
            onClick={fetchLogs}
            className="flex items-center justify-center rounded-md border border-primary bg-primary py-1 px-3 text-white hover:bg-opacity-90"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      <div className="p-4 border-b border-stroke">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-black">Filter by Type</label>
            <select
              name="type"
              value={filter.type}
              onChange={handleFilterChange}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-4 font-medium outline-none transition focus:border-primary active:border-primary"
            >
              <option value="">All Types</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="error">Error</option>
              <option value="sent_media">Media</option>
            </select>
          </div>
          
          <div>
            <label className="mb-2 block text-sm text-black">Filter by Number</label>
            <input
              type="text"
              name="number"
              placeholder="Enter phone number..."
              value={filter.number}
              onChange={handleFilterChange}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-4 font-medium outline-none transition focus:border-primary active:border-primary"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-sm text-black">Filter by Date</label>
            <input
              type="date"
              name="date"
              value={filter.date}
              onChange={handleFilterChange}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-4 font-medium outline-none transition focus:border-primary active:border-primary"
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-danger-light text-danger">
          <p>{error}</p>
          <button
            onClick={fetchLogs}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}
      
      <div
        ref={logContainerRef}
        className="max-h-96 overflow-y-auto p-4"
      >
        {loading && logs.length === 0 ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500">
            <p>No logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className="border border-stroke rounded-sm p-3"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-medium ${getLogTypeColor(log.type)}`}>
                    {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
                <div className="mb-1">
                  <span className="text-sm text-gray-500">Number:</span>{' '}
                  <span className="font-medium">{log.number}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Content:</span>
                  <div className="mt-1 p-2 bg-gray-1 rounded-sm text-sm break-words">
                    {typeof log.content === 'object'
                      ? JSON.stringify(log.content, null, 2)
                      : log.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
