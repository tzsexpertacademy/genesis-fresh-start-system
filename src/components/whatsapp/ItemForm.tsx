import React, { useState, useEffect } from 'react';
import { Item } from '../../types/whatsapp';

interface ItemFormProps {
  item: Item | null;
  onClose: () => void;
  onSuccess: (item: Item) => void;
  createItemHandler: (itemData: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => Promise<{ status: boolean; message: string; data?: { item: Item } }>;
  updateItemHandler: (id: string, itemData: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>) => Promise<{ status: boolean; message: string; data?: { item: Item } }>;
}

const ItemForm: React.FC<ItemFormProps> = ({
  item,
  onClose,
  onSuccess,
  createItemHandler,
  updateItemHandler
}) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<'product' | 'service' | 'other'>('product');
  const [price, setPrice] = useState<string>(''); // Store as string to handle empty input
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setDescription(item.description || '');
      setType(item.type || 'product');
      setPrice(item.price !== undefined ? String(item.price) : '');
    } else {
      // Reset form for new item
      setName('');
      setDescription('');
      setType('product');
      setPrice('');
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!name.trim()) {
        throw new Error('Name is required');
      }
      if (!type) {
        throw new Error('Type is required');
      }

      const itemData: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        price: price.trim() === '' ? undefined : parseFloat(price),
      };

      let response;
      if (item) {
        response = await updateItemHandler(item.id, itemData);
      } else {
        response = await createItemHandler(itemData);
      }

      if (response.status && response.data?.item) {
        onSuccess(response.data.item);
      } else {
        throw new Error(response.message || 'Failed to save item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {item ? 'Edit Item' : 'Add New Item'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={loading}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="itemName" className="mb-1 block text-sm font-medium text-black dark:text-white">
              Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="itemName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="itemDescription" className="mb-1 block text-sm font-medium text-black dark:text-white">
              Description
            </label>
            <textarea
              id="itemDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter item description (optional)"
              rows={3}
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            ></textarea>
          </div>

          <div>
            <label htmlFor="itemType" className="mb-1 block text-sm font-medium text-black dark:text-white">
              Type <span className="text-danger">*</span>
            </label>
            <select
              id="itemType"
              value={type}
              onChange={(e) => setType(e.target.value as 'product' | 'service' | 'other')}
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            >
              <option value="product">Product</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="itemPrice" className="mb-1 block text-sm font-medium text-black dark:text-white">
              Price (IDR)
            </label>
            <input
              type="number"
              id="itemPrice"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price (optional, e.g., 50000)"
              min="0"
              step="any"
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stroke py-2 px-5 text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand-500 py-2 px-5 text-white hover:bg-brand-600 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : item ? (
                'Update Item'
              ) : (
                'Add Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemForm;