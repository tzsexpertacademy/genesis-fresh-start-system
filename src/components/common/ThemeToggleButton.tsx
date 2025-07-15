import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggleButton: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={handleThemeToggle}
      className="relative flex h-8 w-14 items-center justify-center rounded-full bg-gray-200 transition-colors dark:bg-gray-700"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span
        className={`absolute left-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
          theme === 'dark' ? 'translate-x-6' : ''
        }`}
      />
      {/* Sun icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute left-1 h-4 w-4 text-yellow-500 transition-opacity ${
          theme === 'light' ? 'opacity-100' : 'opacity-0'
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
          clipRule="evenodd"
        />
      </svg>
      {/* Moon icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute right-1 h-4 w-4 text-blue-500 transition-opacity ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </button>
  );
};

// Default export removed to use named export instead