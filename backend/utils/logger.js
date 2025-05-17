import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log file path
const logFilePath = path.join(__dirname, '..', 'logs', 'whatsapp.log');

// Ensure log directory exists
fs.ensureDirSync(path.dirname(logFilePath));

// Log activity
export const logActivity = (type, number, content) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    number,
    content: typeof content === 'object' ? JSON.stringify(content) : content,
  };

  // Append to log file
  fs.appendFileSync(
    logFilePath,
    JSON.stringify(logEntry) + '\n',
    { encoding: 'utf8' }
  );

  return logEntry;
};

// Get logs
export const getLogs = (limit = 100) => {
  try {
    if (!fs.existsSync(logFilePath)) {
      return [];
    }

    const logs = fs.readFileSync(logFilePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
      .reverse()
      .slice(0, limit);

    return logs;
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};
