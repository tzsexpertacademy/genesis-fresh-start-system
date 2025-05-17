import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { WhatsAppContactCategory } from '../../types/whatsapp';
import {
  getContactCategories,
  deleteContactCategory,
  getContactsInCategory
} from '../../services/contactService';
import ContactCategoryForm from '../../components/whatsapp/ContactCategoryForm';

const ContactCategories = () => {
  const [categories, setCategories] = useState<WhatsAppContactCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<WhatsAppContactCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch categories
  const fetchData = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const response = await getContactCategories();
      if (response.status) {
        setCategories(response.data.categories);
      } else {
        console.error('API returned error:', response);
        setError('Failed to load categories: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle category deletion
  const handleDeleteCategory = async (id: string) => {
    try {
      // First check if there are contacts in this category
      const contactsResponse = await getContactsInCategory(id);
      if (contactsResponse.status && contactsResponse.data.contacts.length > 0) {
        if (!window.confirm(`This category has ${contactsResponse.data.contacts.length} contacts. Deleting it will remove the category from these contacts. Continue?`)) {
          return;
        }
      } else if (!window.confirm('Are you sure you want to delete this category?')) {
        return;
      }

      const response = await deleteContactCategory(id);
      if (response.status) {
        setCategories(categories.filter(category => category.id !== id));
      } else {
        setError('Failed to delete category');
      }
    } catch (err) {
      setError('An error occurred while deleting the category');
      console.error(err);
    }
  };

  // Handle category edit
  const handleEditCategory = (category: WhatsAppContactCategory) => {
    setEditingCategory(category);
    setShowAddForm(true);
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingCategory(null);
    fetchData();
  };

  // Filter categories by search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <PageMeta title="Contact Categories" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-bold text-black dark:text-white">
            Contact Categories
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href="/whatsapp/contacts" className="rounded-md bg-warning py-2 px-4 text-center font-medium text-white">
              Back to Contacts
            </a>
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowAddForm(true);
              }}
              className="rounded-md bg-primary py-2 px-4 text-center font-medium text-white"
            >
              Add Category
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-10 pr-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            />
            <span className="absolute left-3 top-2.5">
              <svg
                className="fill-body dark:fill-bodydark"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9.16666 3.33332C5.945 3.33332 3.33332 5.945 3.33332 9.16666C3.33332 12.3883 5.945 15 9.16666 15C12.3883 15 15 12.3883 15 9.16666C15 5.945 12.3883 3.33332 9.16666 3.33332ZM1.66666 9.16666C1.66666 5.02452 5.02452 1.66666 9.16666 1.66666C13.3088 1.66666 16.6667 5.02452 16.6667 9.16666C16.6667 13.3088 13.3088 16.6667 9.16666 16.6667C5.02452 16.6667 1.66666 13.3088 1.66666 9.16666Z"
                  fill=""
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M13.2857 13.2857C13.6112 12.9603 14.1388 12.9603 14.4642 13.2857L18.0892 16.9107C18.4147 17.2362 18.4147 17.7638 18.0892 18.0892C17.7638 18.4147 17.2362 18.4147 16.9107 18.0892L13.2857 14.4642C12.9603 14.1388 12.9603 13.6112 13.2857 13.2857Z"
                  fill=""
                />
              </svg>
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-danger bg-danger bg-opacity-5 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Categories grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:gap-7.5">
              {filteredCategories.length === 0 ? (
                <div className="col-span-full flex h-60 items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No categories found. Add a new category to get started.
                  </p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-7.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <h4 className="text-xl font-semibold text-black dark:text-white">
                          {category.name}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-3.5">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="hover:text-primary"
                        >
                          <svg
                            className="fill-current"
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M15.55 2.97499C15.55 2.77499 15.475 2.57499 15.325 2.42499C15.025 2.12499 14.725 1.82499 14.45 1.52499C14.175 1.24999 13.925 0.974987 13.65 0.724987C13.525 0.574987 13.375 0.474987 13.175 0.474987C12.95 0.474987 12.75 0.574987 12.625 0.724987L10.425 2.92499H2.5C1.4 2.92499 0.5 3.82499 0.5 4.92499V14.925C0.5 16.025 1.4 16.925 2.5 16.925H12.5C13.6 16.925 14.5 16.025 14.5 14.925V7.02499L15.35 6.17499C15.475 6.04999 15.55 5.87499 15.55 5.67499V2.97499ZM13.225 5.67499L12.025 6.87499H12.025L10.65 8.24999L10.65 8.24999L9.525 9.37499H9.525L9.075 9.82499C9.025 9.87499 8.95 9.92499 8.85 9.92499C8.85 9.92499 8.85 9.92499 8.825 9.92499C8.75 9.92499 8.675 9.89999 8.625 9.82499C8.575 9.77499 8.55 9.69999 8.55 9.62499C8.55 9.62499 8.55 9.62499 8.55 9.59999L8.575 9.34999V9.34999L8.65 8.77499V8.77499L8.75 8.24999L8.75 8.24999L8.85 7.72499L2.5 7.72499C2.3 7.72499 2.125 7.57499 2.125 7.37499C2.125 7.17499 2.3 7.02499 2.5 7.02499H9.4L9.4 7.02499L9.875 7.02499L11.875 5.02499V5.02499L12.575 4.32499L13.225 3.67499V5.67499ZM13.5 14.925C13.5 15.425 13.1 15.825 12.6 15.825H2.5C2 15.825 1.6 15.425 1.6 14.925V4.92499C1.6 4.42499 2 4.02499 2.5 4.02499H8.85L1.925 10.95C1.825 11.05 1.75 11.175 1.75 11.325V13.325C1.75 13.625 1.975 13.85 2.275 13.85H4.275C4.425 13.85 4.55 13.775 4.65 13.675L11.575 6.74999L13.5 4.82499V14.925Z"
                              fill=""
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="hover:text-danger"
                        >
                          <svg
                            className="fill-current"
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"
                              fill=""
                            />
                            <path
                              d="M9.00039 9.11255C8.66289 9.11255 8.35352 9.3938 8.35352 9.75942V13.3313C8.35352 13.6688 8.63477 13.9782 9.00039 13.9782C9.33789 13.9782 9.64727 13.6969 9.64727 13.3313V9.75942C9.64727 9.3938 9.33789 9.11255 9.00039 9.11255Z"
                              fill=""
                            />
                            <path
                              d="M11.2502 9.67504C10.8846 9.64692 10.6033 9.90004 10.5752 10.2657L10.4064 12.7407C10.3783 13.0782 10.6314 13.3875 10.9971 13.4157C11.0252 13.4157 11.0252 13.4157 11.0533 13.4157C11.3908 13.4157 11.6721 13.1625 11.6721 12.825L11.8408 10.35C11.8408 9.98442 11.5877 9.70317 11.2502 9.67504Z"
                              fill=""
                            />
                            <path
                              d="M6.72245 9.67504C6.38495 9.70317 6.1037 10.0125 6.13182 10.35L6.3287 12.825C6.35683 13.1625 6.63808 13.4157 6.94745 13.4157C6.97558 13.4157 6.97558 13.4157 7.0037 13.4157C7.3412 13.3875 7.62245 13.0782 7.59433 12.7407L7.39745 10.2657C7.39745 9.90004 7.08808 9.64692 6.72245 9.67504Z"
                              fill=""
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {category.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center">
                      <span className="text-sm font-medium text-black dark:text-white">
                        Contacts: {category.contact_count || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Add/Edit Category Form Modal */}
        {showAddForm && (
          <ContactCategoryForm
            category={editingCategory}
            onClose={() => {
              setShowAddForm(false);
              setEditingCategory(null);
            }}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </>
  );
};

export default ContactCategories;
