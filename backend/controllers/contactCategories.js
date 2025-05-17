import * as localStorageService from '../services/localStorageService.js';

// Helper function to log operations for debugging
const logOperation = (operation, success, error = null, data = null) => {
  console.log(`${operation}: ${success ? 'Success' : 'Failed'}`);
  if (error) {
    console.error(`${operation} Error:`, error);
  }
  if (data && process.env.NODE_ENV === 'development') {
    console.log(`${operation} Data:`, JSON.stringify(data).substring(0, 200) + '...');
  }
};

// Get all contact categories
export const getContactCategories = async (req, res) => {
  try {
    console.log('Getting all contact categories');

    // Get categories from local storage
    const { data: categories, error } = await localStorageService.getCategories();

    if (error) {
      logOperation('getContactCategories', false, error);
      throw error;
    }

    // Get contacts to count how many are in each category
    const { data: contacts, error: contactsError } = await localStorageService.getContacts();

    if (contactsError) {
      logOperation('getContacts', false, contactsError);
      throw contactsError;
    }

    // Count contacts per category
    const contactCountByCategory = {};
    contacts.forEach(contact => {
      if (contact.categories) {
        contact.categories.forEach(categoryId => {
          if (!contactCountByCategory[categoryId]) {
            contactCountByCategory[categoryId] = 0;
          }
          contactCountByCategory[categoryId]++;
        });
      }
    });

    // Add contact count to each category
    const categoriesWithCount = categories.map(category => ({
      ...category,
      contact_count: contactCountByCategory[category.id] || 0,
    }));

    logOperation('getContactCategories', true, null, { count: categories.length });

    res.json({
      status: true,
      message: 'Contact categories retrieved successfully',
      data: {
        categories: categoriesWithCount,
      },
    });
  } catch (error) {
    console.error('Error getting contact categories:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get contact categories',
      error: error.message,
    });
  }
};

// Get a single contact category by ID
export const getContactCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get category from local storage
    const { data: category, error } = await localStorageService.getCategory(id);

    if (error) {
      logOperation('getContactCategory', false, error);
      throw error;
    }

    if (!category) {
      return res.status(404).json({
        status: false,
        message: 'Contact category not found',
      });
    }

    // Get contacts to find which ones are in this category
    const { data: contacts, error: contactsError } = await localStorageService.getContacts();

    if (contactsError) {
      logOperation('getContacts', false, contactsError);
      throw contactsError;
    }

    // Filter contacts that have this category
    const contactsInCategory = contacts.filter(contact =>
      contact.categories && contact.categories.includes(id)
    );

    res.json({
      status: true,
      message: 'Contact category retrieved successfully',
      data: {
        category,
        contacts: contactsInCategory,
      },
    });
  } catch (error) {
    console.error('Error getting contact category:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get contact category',
      error: error.message,
    });
  }
};

// Create a new contact category
export const createContactCategory = async (req, res) => {
  try {
    const { name, color, description } = req.body;

    if (!name || !color) {
      return res.status(400).json({
        status: false,
        message: 'Name and color are required',
      });
    }

    // Get existing categories to check for duplicates
    const { data: categories, error: categoriesError } = await localStorageService.getCategories();

    if (categoriesError) {
      logOperation('getCategories', false, categoriesError);
      throw categoriesError;
    }

    // Check if category with same name already exists
    const existingCategory = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existingCategory) {
      return res.status(400).json({
        status: false,
        message: 'A category with this name already exists',
      });
    }

    // Create category data
    const categoryData = {
      name,
      color,
      description: description || ''
    };

    // Create category in local storage
    const { data: category, error } = await localStorageService.createCategory(categoryData);

    if (error) {
      logOperation('createContactCategory', false, error);
      throw error;
    }

    logOperation('createContactCategory', true, null, category);

    res.status(201).json({
      status: true,
      message: 'Contact category created successfully',
      data: {
        category,
      },
    });
  } catch (error) {
    console.error('Error creating contact category:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to create contact category',
      error: error.message,
    });
  }
};

// Update an existing contact category
export const updateContactCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, description } = req.body;

    // Get existing categories to check for duplicates
    const { data: categories, error: categoriesError } = await localStorageService.getCategories();

    if (categoriesError) {
      logOperation('getCategories', false, categoriesError);
      throw categoriesError;
    }

    // Check if the new name is already used by another category
    if (name) {
      const duplicateCategory = categories.find(c =>
        c.name.toLowerCase() === name.toLowerCase() && c.id !== id
      );

      if (duplicateCategory) {
        return res.status(400).json({
          status: false,
          message: 'Another category with this name already exists',
        });
      }
    }

    // Create update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;

    // Update category in local storage
    const { data: updatedCategory, error } = await localStorageService.updateCategory(id, updateData);

    if (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: false,
          message: 'Contact category not found',
        });
      }

      logOperation('updateContactCategory', false, error);
      throw error;
    }

    logOperation('updateContactCategory', true, null, updatedCategory);

    res.json({
      status: true,
      message: 'Contact category updated successfully',
      data: {
        category: updatedCategory,
      },
    });
  } catch (error) {
    console.error('Error updating contact category:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to update contact category',
      error: error.message,
    });
  }
};

// Delete a contact category
export const deleteContactCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete category from local storage
    const { data, error } = await localStorageService.deleteCategory(id);

    if (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: false,
          message: 'Contact category not found',
        });
      }

      logOperation('deleteContactCategory', false, error);
      throw error;
    }

    logOperation('deleteContactCategory', true);

    res.json({
      status: true,
      message: 'Contact category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact category:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete contact category',
      error: error.message,
    });
  }
};

// Get contacts in a category
export const getContactsInCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get category from local storage
    const { data: category, error } = await localStorageService.getCategory(id);

    if (error) {
      logOperation('getCategory', false, error);
      throw error;
    }

    if (!category) {
      return res.status(404).json({
        status: false,
        message: 'Contact category not found',
      });
    }

    // Get contacts to find which ones are in this category
    const { data: contacts, error: contactsError } = await localStorageService.getContacts();

    if (contactsError) {
      logOperation('getContacts', false, contactsError);
      throw contactsError;
    }

    // Filter contacts that have this category
    const contactsInCategory = contacts.filter(contact =>
      contact.categories && contact.categories.includes(id)
    );

    res.json({
      status: true,
      message: 'Contacts in category retrieved successfully',
      data: {
        category,
        contacts: contactsInCategory,
      },
    });
  } catch (error) {
    console.error('Error getting contacts in category:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get contacts in category',
      error: error.message,
    });
  }
};
