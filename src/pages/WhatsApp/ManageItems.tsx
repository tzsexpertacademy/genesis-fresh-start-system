import React, { useState, useEffect, useCallback } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { Item } from '../../types/whatsapp';
import { getItems, deleteItem, createItem, updateItem } from '../../services/itemService';
import ItemForm from '../../components/whatsapp/ItemForm'; // Assuming ItemForm is in components/whatsapp
import { PlusIcon, PencilIcon, TrashBinIcon } from '../../icons'; // Assuming you have these icons

const ManageItems: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getItems();
      if (response.status && response.data?.items) {
        setItems(response.data.items);
      } else {
        setError(response.message || 'Failed to load items');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await deleteItem(id);
        if (response.status) {
          setItems(prevItems => prevItems.filter(item => item.id !== id));
        } else {
          setError(response.message || 'Failed to delete item');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormSuccess = (updatedOrNewItem: Item) => {
    if (editingItem) {
      setItems(prevItems => prevItems.map(item => (item.id === updatedOrNewItem.id ? updatedOrNewItem : item)));
    } else {
      setItems(prevItems => [updatedOrNewItem, ...prevItems]);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return 'N/A';
    return `Rp${price.toLocaleString('id-ID')}`;
  };

  return (
    <>
      <PageMeta title="Manage Items (Products/Services)" />
      <div className="mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-bold text-black dark:text-white">
            Manage Items
          </h2>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-brand-500 py-3 px-5 text-center font-medium text-white hover:bg-brand-600 lg:px-6 xl:px-7"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Item
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search items by name, description, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="min-w-[220px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">Name</th>
                    <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">Type</th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Price</th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 px-4 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                          No items found. {searchTerm && "Try adjusting your search."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td className="border-b border-[#eee] py-5 px-4 pl-9 dark:border-strokedark xl:pl-11">
                          <h5 className="font-medium text-black dark:text-white">{item.name}</h5>
                          {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</p>}
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <span className={`inline-block rounded-full py-1 px-2.5 text-xs font-medium ${
                            item.type === 'product' ? 'bg-success-light text-success' :
                            item.type === 'service' ? 'bg-warning-light text-warning' :
                            'bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-900 dark:text-blue-light-300'
                          }`}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </span>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <p className="text-black dark:text-white">{formatPrice(item.price)}</p>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <div className="flex items-center justify-end space-x-3.5">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="hover:text-primary"
                              title="Edit Item"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="hover:text-danger"
                              title="Delete Item"
                            >
                              <TrashBinIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <ItemForm
            item={editingItem}
            onClose={() => { setShowForm(false); setEditingItem(null); }}
            onSuccess={handleFormSuccess}
            createItemHandler={createItem}
            updateItemHandler={updateItem}
          />
        )}
      </div>
    </>
  );
};

export default ManageItems;