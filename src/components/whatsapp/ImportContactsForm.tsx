import { useState } from 'react';
import { importContacts } from '../../services/contactService';

interface ImportContactsFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportContactsForm = ({ onClose, onSuccess }: ImportContactsFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check if file is CSV
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImportResult(null);

    try {
      if (!file) {
        throw new Error('Please select a CSV file');
      }

      const response = await importContacts(file);

      if (response.status) {
        setImportResult({
          imported: response.data.imported,
          errors: response.data.errors || [],
        });
        
        if (response.data.imported > 0) {
          // Only call onSuccess if at least one contact was imported
          onSuccess();
        }
      } else {
        throw new Error(response.message || 'Failed to import contacts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Generate sample CSV content
  const sampleCsvContent = `name,phone_number,email,notes
John Doe,628123456789,john@example.com,Sample contact
Jane Smith,628987654321,jane@example.com,Another sample`;

  // Handle download sample CSV
  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_contacts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Import Contacts
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger bg-danger bg-opacity-5 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        {importResult && (
          <div className="mb-4 rounded-lg border border-success bg-success bg-opacity-5 px-4 py-3 text-success">
            <p>Successfully imported {importResult.imported} contacts.</p>
            {importResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Errors:</p>
                <ul className="ml-4 list-disc">
                  {importResult.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="csvFile"
              className="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >
              CSV File <span className="text-danger">*</span>
            </label>
            <input
              type="file"
              id="csvFile"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Upload a CSV file with columns: name, phone_number, email (optional), notes (optional)
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-4 dark:border-strokedark dark:bg-meta-4">
            <h4 className="mb-2 text-sm font-medium text-black dark:text-white">
              CSV Format Requirements:
            </h4>
            <ul className="ml-4 list-disc text-sm text-gray-600 dark:text-gray-400">
              <li>File must be in CSV format</li>
              <li>First row should contain column headers</li>
              <li>Required columns: name, phone_number</li>
              <li>Optional columns: email, notes</li>
              <li>Phone numbers should include country code (e.g., 628123456789)</li>
            </ul>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Download Sample CSV
            </button>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stroke py-2 px-6 text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary py-2 px-6 text-white hover:bg-opacity-90 disabled:bg-opacity-70"
              disabled={loading || !file}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Importing...
                </span>
              ) : (
                'Import Contacts'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportContactsForm;
