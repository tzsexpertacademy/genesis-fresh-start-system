import { apiRequest } from './whatsappService';
import { WhatsAppContact, WhatsAppContactCategory } from '../types/whatsapp';

// Get all contacts
export const getContacts = async () => {
  return apiRequest('/contacts');
};

// Get a single contact by ID
export const getContact = async (id: string) => {
  return apiRequest(`/contacts/${id}`);
};

// Create a new contact
export const createContact = async (contact: {
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
  categories?: string[];
}) => {
  return apiRequest('/contacts', {
    method: 'POST',
    body: JSON.stringify(contact),
  });
};

// Update an existing contact
export const updateContact = async (
  id: string,
  contact: {
    name?: string;
    phone_number?: string;
    email?: string;
    notes?: string;
    categories?: string[];
  }
) => {
  return apiRequest(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contact),
  });
};

// Delete a contact
export const deleteContact = async (id: string) => {
  return apiRequest(`/contacts/${id}`, {
    method: 'DELETE',
  });
};

// Import contacts from CSV file
export const importContacts = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Create headers but only add x-api-key if it's not empty or default
    const headers: Record<string, string> = {};

    // Use a longer timeout for file uploads (30 seconds)
    const response = await apiRequest('/contacts/import', {
      method: 'POST',
      headers,
      body: formData,
      isFormData: true,
    }, 30000);

    return response;
  } catch (error) {
    console.error('Error importing contacts:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: null,
    };
  }
};

// Get all contact categories
export const getContactCategories = async () => {
  return apiRequest('/contact-categories');
};

// Get a single contact category by ID
export const getContactCategory = async (id: string) => {
  return apiRequest(`/contact-categories/${id}`);
};

// Create a new contact category
export const createContactCategory = async (category: {
  name: string;
  color: string;
  description?: string;
}) => {
  return apiRequest('/contact-categories', {
    method: 'POST',
    body: JSON.stringify(category),
  });
};

// Update an existing contact category
export const updateContactCategory = async (
  id: string,
  category: {
    name?: string;
    color?: string;
    description?: string;
  }
) => {
  return apiRequest(`/contact-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(category),
  });
};

// Delete a contact category
export const deleteContactCategory = async (id: string) => {
  return apiRequest(`/contact-categories/${id}`, {
    method: 'DELETE',
  });
};

// Get contacts in a category
export const getContactsInCategory = async (id: string) => {
  return apiRequest(`/contact-categories/${id}/contacts`);
};

// Helper function to format phone number for display
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on length and country code
  if (cleaned.startsWith('62') && cleaned.length >= 10) {
    // Indonesian number
    const countryCode = cleaned.substring(0, 2);
    const rest = cleaned.substring(2);
    
    if (rest.startsWith('8')) {
      // Mobile number
      if (rest.length <= 4) {
        return `+${countryCode} ${rest}`;
      } else if (rest.length <= 7) {
        return `+${countryCode} ${rest.substring(0, 3)}-${rest.substring(3)}`;
      } else {
        return `+${countryCode} ${rest.substring(0, 3)}-${rest.substring(3, 7)}-${rest.substring(7)}`;
      }
    } else {
      // Other number
      return `+${countryCode} ${rest}`;
    }
  } else if (cleaned.length >= 10) {
    // Generic international format
    return `+${cleaned.substring(0, cleaned.length - 9)} ${cleaned.substring(cleaned.length - 9, cleaned.length - 6)}-${cleaned.substring(cleaned.length - 6, cleaned.length - 3)}-${cleaned.substring(cleaned.length - 3)}`;
  } else {
    // Just return the cleaned number if we can't format it
    return cleaned;
  }
};

// Helper function to clean phone number for storage/API
export const cleanPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-numeric characters
  return phoneNumber.replace(/\D/g, '');
};
