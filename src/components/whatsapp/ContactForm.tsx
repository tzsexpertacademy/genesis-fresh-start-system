import { useState, useEffect } from 'react';
import { WhatsAppContact, WhatsAppContactCategory } from '../../types/whatsapp';
import { createContact, updateContact, cleanPhoneNumber } from '../../services/contactService';

interface ContactFormProps {
  contact: WhatsAppContact | null;
  categories: WhatsAppContactCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

const ContactForm = ({ contact, categories, onClose, onSuccess }: ContactFormProps) => {
  const [name, setName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with contact data if editing
  useEffect(() => {
    if (contact) {
      setName(contact.name || '');
      setPhoneNumber(contact.phone_number || '');
      setEmail(contact.email || '');
      setNotes(contact.notes || '');
      
      if (contact.categories && contact.categories.length > 0) {
        setSelectedCategories(contact.categories.map(cat => cat.id));
      }
    }
  }, [contact]);

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

      if (!phoneNumber.trim()) {
        throw new Error('Phone number is required');
      }

      // Clean phone number
      const formattedPhoneNumber = cleanPhoneNumber(phoneNumber);

      if (formattedPhoneNumber.length < 10) {
        throw new Error('Phone number is too short');
      }

      // Prepare contact data
      const contactData = {
        name: name.trim(),
        phone_number: formattedPhoneNumber,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      // Create or update contact
      let response;
      if (contact) {
        response = await updateContact(contact.id, contactData);
      } else {
        response = await createContact(contactData);
      }

      if (response.status) {
        onSuccess();
      } else {
        throw new Error(response.message || 'Failed to save contact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {contact ? 'Edit Contact' : 'Add New Contact'}
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
              placeholder="Enter contact name"
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="phoneNumber"
              className="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >
              Phone Number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number with country code (e.g., 628123456789)"
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Include country code without + (e.g., 628123456789 for Indonesia)
            </p>
          </div>

          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address (optional)"
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="notes"
              className="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes (optional)"
              rows={3}
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            ></textarea>
          </div>

          <div className="mb-6">
            <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:focus:ring-primary"
                  />
                  <label
                    htmlFor={`category-${category.id}`}
                    className="flex items-center text-sm font-medium text-black dark:text-white"
                  >
                    <span
                      className="mr-1.5 inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></span>
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stroke py-2 px-6 text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 py-2 px-6 text-white hover:bg-brand-600 disabled:opacity-70"
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
              ) : contact ? (
                'Update Contact'
              ) : (
                'Add Contact'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;