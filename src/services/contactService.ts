// Service response type
type ServiceResponse<T = any> = {
  status: boolean;
  data: T;
  message?: string;
};

// Contact service exports
export const getContacts = async (): Promise<ServiceResponse<any[]>> => {
  console.log('Getting contacts...');
  return {
    status: true,
    data: []
  };
};

export const createContact = async (contact: any): Promise<ServiceResponse<any>> => {
  console.log('Creating contact:', contact);
  return {
    status: true,
    data: contact,
    message: 'Contact created successfully'
  };
};

export const updateContact = async (id: string, contact: any): Promise<ServiceResponse<any>> => {
  console.log('Updating contact:', id, contact);
  return {
    status: true,
    data: contact,
    message: 'Contact updated successfully'
  };
};

export const deleteContact = async (id: string): Promise<ServiceResponse<boolean>> => {
  console.log('Deleting contact:', id);
  return {
    status: true,
    data: true,
    message: 'Contact deleted successfully'
  };
};

export const getContactCategories = async (): Promise<ServiceResponse<any[]>> => {
  console.log('Getting contact categories...');
  return {
    status: true,
    data: []
  };
};

export const createContactCategory = async (category: any): Promise<ServiceResponse<any>> => {
  console.log('Creating category:', category);
  return {
    status: true,
    data: category,
    message: 'Category created successfully'
  };
};

export const updateContactCategory = async (id: string, category: any): Promise<ServiceResponse<any>> => {
  console.log('Updating category:', id, category);
  return {
    status: true,
    data: category,
    message: 'Category updated successfully'
  };
};

export const deleteContactCategory = async (id: string): Promise<ServiceResponse<boolean>> => {
  console.log('Deleting category:', id);
  return {
    status: true,
    data: true,
    message: 'Category deleted successfully'
  };
};

export const getContactsInCategory = async (categoryId: string): Promise<ServiceResponse<any[]>> => {
  console.log('Getting contacts in category:', categoryId);
  return {
    status: true,
    data: []
  };
};

export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.startsWith('55') ? `+${cleaned}` : `+55${cleaned}`;
};

export const importContacts = async (file: File): Promise<ServiceResponse<any[]>> => {
  console.log('Importing contacts from file:', file.name);
  return {
    status: true,
    data: [],
    message: 'Contacts imported successfully'
  };
};

// Backward compatibility
export const contactService = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getContactCategories,
  createContactCategory,
  updateContactCategory,
  deleteContactCategory,
  getContactsInCategory,
  cleanPhoneNumber,
  formatPhoneNumber,
  importContacts
};