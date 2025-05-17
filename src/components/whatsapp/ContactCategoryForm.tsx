import { useState, useEffect } from 'react';
import { WhatsAppContactCategory } from '../../types/whatsapp';
import { createContactCategory, updateContactCategory } from '../../services/contactService';

interface ContactCategoryFormProps {
  category: WhatsAppContactCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Predefined colors for categories
const predefinedColors = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
];

const ContactCategoryForm = ({ category, onClose, onSuccess }: ContactCategoryFormProps) => {
  const [name, setName] = useState<string>('');
  const [color, setColor] = useState<string>(predefinedColors[0]);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with category data if editing
  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setColor(category.color || predefinedColors[0]);
      setDescription(category.description || '');
    }
  }, [category]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!name.trim()) {
        throw new Error('Name is required');
      }

      if (!color) {
        throw new Error('Color is required');
      }

      // Prepare category data
      const categoryData = {
        name: name.trim(),
        color,
        description: description.trim() || undefined,
      };

      // Create or update category
      let response;
      if (category) {
        response = await updateContactCategory(category.id, categoryData);
      } else {
        response = await createContactCategory(categoryData);
      }

      if (response.status) {
        onSuccess();
      } else {
        throw new Error(response.message || 'Failed to save category');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {category ? 'Edit Category' : 'Add New Category'}
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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >
              Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="color"
              className="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >
              Color <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {predefinedColors.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 ${
                    color === colorOption ? 'border-black dark:border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                ></button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-block h-6 w-6 rounded-full"
                style={{ backgroundColor: color }}
              ></span>
              <span className="text-sm">{color}</span>
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="description"
              className="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            ></textarea>
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
              disabled={loading}
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
                  Saving...
                </span>
              ) : category ? (
                'Update Category'
              ) : (
                'Add Category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactCategoryForm;
