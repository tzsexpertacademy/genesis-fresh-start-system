import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { WhatsAppContact, WhatsAppContactCategory } from '../../types/whatsapp';
import { getContacts, deleteContact, formatPhoneNumber } from '../../services/contactService';
import { getContactCategories } from '../../services/contactService';
import ContactForm from '../../components/whatsapp/ContactForm';
import ImportContactsForm from '../../components/whatsapp/ImportContactsForm';

const Contacts = () => {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [categories, setCategories] = useState<WhatsAppContactCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showImportForm, setShowImportForm] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<WhatsAppContact | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch contacts and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const contactsResponse = await getContacts();
      const categoriesResponse = await getContactCategories();

      if (contactsResponse.status) {
        setContacts(contactsResponse.data.contacts || []);
      } 
      
      if (categoriesResponse.status) {
        setCategories(categoriesResponse.data.categories || []);
      }
      
      if (!contactsResponse.status || !categoriesResponse.status) {
        setError('Failed to load contacts or categories');
      }
    } catch (err) {
      console.error('Error fetching contacts/categories:', err);
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle contact deletion
  const handleDeleteContact = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        const response = await deleteContact(id);
        if (response.status) {
          setContacts(contacts.filter(contact => contact.id !== id));
        } else {
          setError('Failed to delete contact');
        }
      } catch (err) {
        setError('An error occurred while deleting the contact');
        console.error(err);
      }
    }
  };

  // Handle contact edit
  const handleEditContact = (contact: WhatsAppContact) => {
    setEditingContact(contact);
    setShowAddForm(true);
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    setShowAddForm(false);
    setShowImportForm(false);
    setEditingContact(null);
    fetchData();
  };

  // Filter contacts by category and search term
  const filteredContacts = contacts.filter(contact => {
    // Filter by category
    const categoryMatch = selectedCategory === 'all' ||
      (contact.categories && contact.categories.some(cat => cat.id === selectedCategory));

    // Filter by search term
    const searchMatch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone_number.includes(searchTerm) ||
      (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return categoryMatch && searchMatch;
  });

  return (
    <>
      <PageMeta 
        title="WhatsApp Contacts" 
        description="Manage your WhatsApp contacts, add new contacts and import contacts from CSV files."
      />

      <div className="mx-auto">
        {/* Header with title and actions buttons */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-black dark:text-white">
            WhatsApp Contacts
          </h2>
          
          {/* Action buttons - positioned on the right side */}
          <div className="flex items-center gap-2">
            {/* Add Contact button */}
            <button
              onClick={() => {
                setEditingContact(null);
                setShowAddForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-stroke py-2 px-5 text-center font-medium text-black hover:bg-opacity-90 dark:border-strokedark dark:text-white md:px-6"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3.33331V12.6666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.33334 8H12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Contact
            </button>
            
            {/* Import Contacts button */}
            <button
              onClick={() => setShowImportForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-stroke py-2 px-5 text-center font-medium text-black hover:bg-opacity-90 dark:border-strokedark dark:text-white md:px-6"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 10L14 12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14L3.33333 14C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.66667 6.66669L8 10L11.3333 6.66669" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 10L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Import
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          {/* Category filter */}
          <div className="flex items-center gap-3">
            <label htmlFor="categoryFilter" className="text-sm font-medium text-black dark:text-white">
              Category:
            </label>
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-auto min-w-[160px] rounded border border-stroke py-2 px-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.contact_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full max-w-[240px]">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.0001 14.0001L11.3334 11.3334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 rounded-md border border-danger bg-danger bg-opacity-5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Contacts table */}
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="grid grid-cols-12 border-b border-stroke py-4 px-4 dark:border-strokedark">
                <div className="col-span-5">
                  <h5 className="font-medium text-black dark:text-white">Name</h5>
                </div>
                <div className="col-span-3 hidden md:block">
                  <h5 className="font-medium text-black dark:text-white">Phone</h5>
                </div>
                <div className="col-span-3 hidden md:block">
                  <h5 className="font-medium text-black dark:text-white">Categories</h5>
                </div>
                <div className="col-span-7 md:col-span-1 flex justify-end">
                  <h5 className="font-medium text-black dark:text-white">Actions</h5>
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="flex h-60 items-center justify-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No contacts found. Add a new contact to get started.
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid grid-cols-12 border-b border-stroke py-4 px-4 hover:bg-whiten dark:border-strokedark dark:hover:bg-boxdark-2"
                  >
                    <div className="col-span-5 flex items-center">
                      <div className="flex flex-col">
                        <h6 className="font-medium text-black dark:text-white">
                          {contact.name}
                        </h6>
                        {contact.email && (
                          <p className="text-sm text-gray-500">{contact.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 hidden md:flex items-center">
                      <p className="text-sm text-black dark:text-white">
                        {formatPhoneNumber(contact.phone_number)}
                      </p>
                    </div>
                    <div className="col-span-3 hidden md:flex items-center">
                      <div className="flex flex-wrap gap-1">
                        {contact.categories && contact.categories.length > 0 ? (
                          contact.categories.map((category) => (
                            <span
                              key={category.id}
                              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: category.color, color: '#fff' }}
                            >
                              {category.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No categories</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-7 md:col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditContact(contact)}
                        className="hover:text-primary"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8.25 3H3C2.60218 3 2.22064 3.15804 1.93934 3.43934C1.65804 3.72064 1.5 4.10218 1.5 4.5V15C1.5 15.3978 1.65804 15.7794 1.93934 16.0607C2.22064 16.342 2.60218 16.5 3 16.5H13.5C13.8978 16.5 14.2794 16.342 14.5607 16.0607C14.842 15.7794 15 15.3978 15 15V9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M13.875 1.87498C14.1734 1.57653 14.578 1.40894 15 1.40894C15.422 1.40894 15.8266 1.57653 16.125 1.87498C16.4234 2.17343 16.591 2.57805 16.591 2.99998C16.591 3.42191 16.4234 3.82653 16.125 4.12498L9 11.25L6 12L6.75 9.00001L13.875 1.87498Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="hover:text-danger"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <Link
                        to={`/whatsapp/send-message?number=${contact.phone_number}`}
                        className="hover:text-success"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16.5 9C16.5 13.14 13.14 16.5 9 16.5C4.86 16.5 1.5 13.14 1.5 9C1.5 4.86 4.86 1.5 9 1.5C13.14 1.5 16.5 4.86 16.5 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 7.5L8.625 10.875L7.125 9.375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 7.5L6.75 8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Add/Edit Contact Form Modal */}
        {showAddForm && (
          <ContactForm
            contact={editingContact}
            categories={categories}
            onClose={() => {
              setShowAddForm(false);
              setEditingContact(null);
            }}
            onSuccess={handleFormSuccess}
          />
        )}

        {/* Import Contacts Form Modal */}
        {showImportForm && (
          <ImportContactsForm
            onClose={() => setShowImportForm(false)}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </>
  );
};

export default Contacts;
