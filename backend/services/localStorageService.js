import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.join(__dirname, '..', 'data');
fs.ensureDirSync(dataDir);

// File paths
const contactsFile = path.join(dataDir, 'contacts.json');
const categoriesFile = path.join(dataDir, 'categories.json');

// Ensure files exist
if (!fs.existsSync(contactsFile)) {
  fs.writeJsonSync(contactsFile, [], { spaces: 2 });
}

if (!fs.existsSync(categoriesFile)) {
  fs.writeJsonSync(categoriesFile, [], { spaces: 2 });
}

// Contact functions
export const getContacts = async () => {
  try {
    const contacts = await fs.readJson(contactsFile);
    return { data: contacts, error: null };
  } catch (error) {
    console.error('Error reading contacts:', error);
    return { data: [], error };
  }
};

export const getContact = async (id) => {
  try {
    const contacts = await fs.readJson(contactsFile);
    const contact = contacts.find(c => c.id === id);
    return { data: contact || null, error: null };
  } catch (error) {
    console.error('Error reading contact:', error);
    return { data: null, error };
  }
};

export const createContact = async (contactData) => {
  try {
    const contacts = await fs.readJson(contactsFile);
    
    // Check if contact with same phone number already exists
    const existingContact = contacts.find(c => c.phone_number === contactData.phone_number);
    if (existingContact) {
      return { 
        data: null, 
        error: { message: 'A contact with this phone number already exists' } 
      };
    }
    
    // Create new contact with ID and timestamps
    const newContact = {
      id: uuidv4(),
      ...contactData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    contacts.push(newContact);
    await fs.writeJson(contactsFile, contacts, { spaces: 2 });
    
    return { data: newContact, error: null };
  } catch (error) {
    console.error('Error creating contact:', error);
    return { data: null, error };
  }
};

export const updateContact = async (id, contactData) => {
  try {
    const contacts = await fs.readJson(contactsFile);
    const index = contacts.findIndex(c => c.id === id);
    
    if (index === -1) {
      return { 
        data: null, 
        error: { message: 'Contact not found' } 
      };
    }
    
    // Check if updating to a phone number that already exists on another contact
    if (contactData.phone_number) {
      const existingContact = contacts.find(c => 
        c.phone_number === contactData.phone_number && c.id !== id
      );
      
      if (existingContact) {
        return { 
          data: null, 
          error: { message: 'Another contact with this phone number already exists' } 
        };
      }
    }
    
    // Update contact
    const updatedContact = {
      ...contacts[index],
      ...contactData,
      updated_at: new Date().toISOString()
    };
    
    contacts[index] = updatedContact;
    await fs.writeJson(contactsFile, contacts, { spaces: 2 });
    
    return { data: updatedContact, error: null };
  } catch (error) {
    console.error('Error updating contact:', error);
    return { data: null, error };
  }
};

export const deleteContact = async (id) => {
  try {
    const contacts = await fs.readJson(contactsFile);
    const filteredContacts = contacts.filter(c => c.id !== id);
    
    if (filteredContacts.length === contacts.length) {
      return { 
        data: null, 
        error: { message: 'Contact not found' } 
      };
    }
    
    await fs.writeJson(contactsFile, filteredContacts, { spaces: 2 });
    
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting contact:', error);
    return { data: null, error };
  }
};

export const importContacts = async (contactsToImport) => {
  try {
    const contacts = await fs.readJson(contactsFile);
    const existingPhoneNumbers = new Set(contacts.map(c => c.phone_number));
    
    const newContacts = [];
    const errors = [];
    
    for (const contact of contactsToImport) {
      if (existingPhoneNumbers.has(contact.phone_number)) {
        errors.push(`Contact with phone number ${contact.phone_number} already exists`);
        continue;
      }
      
      const newContact = {
        id: uuidv4(),
        ...contact,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      newContacts.push(newContact);
      existingPhoneNumbers.add(contact.phone_number);
    }
    
    if (newContacts.length > 0) {
      const updatedContacts = [...contacts, ...newContacts];
      await fs.writeJson(contactsFile, updatedContacts, { spaces: 2 });
    }
    
    return { 
      data: { 
        imported: newContacts.length,
        errors
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error importing contacts:', error);
    return { data: null, error };
  }
};

// Category functions
export const getCategories = async () => {
  try {
    const categories = await fs.readJson(categoriesFile);
    return { data: categories, error: null };
  } catch (error) {
    console.error('Error reading categories:', error);
    return { data: [], error };
  }
};

export const getCategory = async (id) => {
  try {
    const categories = await fs.readJson(categoriesFile);
    const category = categories.find(c => c.id === id);
    return { data: category || null, error: null };
  } catch (error) {
    console.error('Error reading category:', error);
    return { data: null, error };
  }
};

export const createCategory = async (categoryData) => {
  try {
    const categories = await fs.readJson(categoriesFile);
    
    // Create new category with ID and timestamps
    const newCategory = {
      id: uuidv4(),
      ...categoryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    categories.push(newCategory);
    await fs.writeJson(categoriesFile, categories, { spaces: 2 });
    
    return { data: newCategory, error: null };
  } catch (error) {
    console.error('Error creating category:', error);
    return { data: null, error };
  }
};

export const updateCategory = async (id, categoryData) => {
  try {
    const categories = await fs.readJson(categoriesFile);
    const index = categories.findIndex(c => c.id === id);
    
    if (index === -1) {
      return { 
        data: null, 
        error: { message: 'Category not found' } 
      };
    }
    
    // Update category
    const updatedCategory = {
      ...categories[index],
      ...categoryData,
      updated_at: new Date().toISOString()
    };
    
    categories[index] = updatedCategory;
    await fs.writeJson(categoriesFile, categories, { spaces: 2 });
    
    return { data: updatedCategory, error: null };
  } catch (error) {
    console.error('Error updating category:', error);
    return { data: null, error };
  }
};

export const deleteCategory = async (id) => {
  try {
    const categories = await fs.readJson(categoriesFile);
    const filteredCategories = categories.filter(c => c.id !== id);
    
    if (filteredCategories.length === categories.length) {
      return { 
        data: null, 
        error: { message: 'Category not found' } 
      };
    }
    
    await fs.writeJson(categoriesFile, filteredCategories, { spaces: 2 });
    
    // Also update contacts to remove this category
    const contacts = await fs.readJson(contactsFile);
    const updatedContacts = contacts.map(contact => {
      if (contact.categories) {
        return {
          ...contact,
          categories: contact.categories.filter(catId => catId !== id)
        };
      }
      return contact;
    });
    
    await fs.writeJson(contactsFile, updatedContacts, { spaces: 2 });
    
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { data: null, error };
  }
};
