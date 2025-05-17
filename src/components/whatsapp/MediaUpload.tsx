import { useState, useRef } from 'react';
import { sendMediaMessage } from '../../services/whatsappService';
import ComponentCard from '../common/ComponentCard';

interface MediaUploadProps {
  onMediaSent?: (result: any) => void;
  disabled?: boolean;
}

const MediaUpload = ({ onMediaSent, disabled = false }: MediaUploadProps) => {
  const [number, setNumber] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate phone number
  const validateNumber = (num: string) => {
    return /^\d+$/.test(num);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Only JPEG, PNG, PDF, and DOC files are allowed.');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setError(null);
    setSuccess(null);
    setProgress(0);

    // Validate inputs
    if (!number || !file) {
      setError('Phone number and file are required');
      return;
    }

    if (!validateNumber(number)) {
      setError('Invalid phone number format. Use country code without + (e.g., 62812345678)');
      return;
    }

    try {
      setLoading(true);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);

      const response = await sendMediaMessage(number, file, caption);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.status) {
        setSuccess('Media sent successfully!');
        setCaption('');
        setFile(null);
        setPreview(null);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        if (onMediaSent) {
          onMediaSent(response.data);
        }
      }
    } catch (error: any) {
      console.error('Error sending media:', error);
      setError(error.message || 'Failed to send media. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title="Send WhatsApp Media"
      desc="Share images, PDFs, and documents via WhatsApp"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 py-3 px-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-red-600 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-500/10 py-3 px-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-green-600 dark:text-green-400">{success}</span>
            </div>
          </div>
        )}

        <div className="mb-4.5">
          <label className="mb-2.5 block text-gray-800 dark:text-white/90">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500 dark:text-gray-400">
              +
            </div>
            <input
              type="text"
              placeholder="62812345678"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              disabled={disabled || loading}
              className="w-full rounded-lg border border-gray-200 bg-transparent py-3 pl-8 pr-5 font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Include country code without + (e.g., 62 for Indonesia)
          </p>
        </div>

        <div className="mb-4.5">
          <label className="mb-2.5 block text-gray-800 dark:text-white/90">
            File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={disabled || loading}
            accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="w-full cursor-pointer rounded-lg border border-gray-200 bg-transparent font-medium outline-none transition file:mr-5 file:border-collapse file:cursor-pointer file:border-0 file:border-r file:border-solid file:border-gray-200 file:bg-gray-50 file:py-3 file:px-5 file:hover:bg-brand-500/10 focus:border-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:file:border-gray-700 dark:file:bg-gray-800 dark:file:text-white/70 dark:disabled:bg-gray-800/50"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Max file size: 5MB. Allowed formats: JPEG, PNG, PDF, DOC, DOCX
          </p>
        </div>

        {preview && (
          <div className="mb-4.5">
            <label className="mb-2.5 block text-gray-800 dark:text-white/90">Preview</label>
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-2 w-full sm:max-w-xs bg-white dark:bg-gray-900">
              <img src={preview} alt="Preview" className="w-full h-auto rounded object-contain max-h-64" />
            </div>
          </div>
        )}

        {file && !preview && (
          <div className="mb-4.5">
            <label className="mb-2.5 block text-gray-800 dark:text-white/90">Selected File</label>
            <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-white/[0.03]">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm truncate w-full text-gray-700 dark:text-gray-300">{file.name}</span>
            </div>
          </div>
        )}

        <div className="mb-4.5">
          <label className="mb-2.5 block text-gray-800 dark:text-white/90">Caption (Optional)</label>
          <textarea
            rows={3}
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={disabled || loading}
            className="w-full rounded-lg border border-gray-200 bg-transparent py-3 px-5 font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:disabled:bg-gray-800/50"
          ></textarea>
        </div>

        {loading && (
          <div className="mb-4.5">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-brand-500 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uploading: {progress}%</p>
          </div>
        )}

        <button
          type="submit"
          disabled={disabled || loading || !file}
          className="flex w-full justify-center rounded-lg bg-brand-500 p-3 font-medium text-white transition hover:bg-brand-600 disabled:bg-opacity-70 disabled:cursor-not-allowed dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </span>
          ) : (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Send Media
            </span>
          )}
        </button>
      </form>
    </ComponentCard>
  );
};

export default MediaUpload;
