import React from 'react';
import GeminiSettingsComponent from '../../components/whatsapp/GeminiSettings';
import ComponentCard from '../../components/common/ComponentCard';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { Link } from 'react-router-dom';

const GeminiSettings: React.FC = () => {
  return (
    <div className="max-w-1536px mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-title-md2 font-bold text-black dark:text-white">
            Gemini AI Settings
          </h2>
        </div>

        <div className="flex gap-2">
          <Link
            to="/whatsapp/gemini"
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Back to Chat
          </Link>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="w-full">
        <ComponentCard title="Gemini AI Configuration">
          <GeminiSettingsComponent />
        </ComponentCard>
      </div>
    </div>
  );
};

// Wrap with ErrorBoundary for error handling
const GeminiSettingsWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <GeminiSettings />
  </ErrorBoundary>
);

export default GeminiSettingsWithErrorBoundary;
