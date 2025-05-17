import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { Readable } from 'stream';
import * as localStorageService from '../services/localStorageService.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Get all contacts
export const getContacts = async (req, res) => {
  try {
    console.log('Getting all contacts');

    // Get contacts from local storage
    const { data: contacts, error } = await localStorageService.getContacts();

    if (error) {
      logOperation('getContacts', false, error);
      throw error;
    }

    logOperation('getContacts', true, null, { count: contacts.length });

    res.json({
      status: true,
      message: 'Contacts retrieved successfully',
      data: {
        contacts: contacts,
      },
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get contacts',
      error: error.message,
    });
  }
};

// Get a single contact by ID
export const getContact = async (req, res) => {
  try {
    const { id } = req.params;

    // Get contact from local storage
    const { data: contact, error } = await localStorageService.getContact(id);

    if (error) {
      throw error;
    }

    if (!contact) {
      return res.status(404).json({
        status: false,
        message: 'Contact not found',
      });
    }

    res.json({
      status: true,
      message: 'Contact retrieved successfully',
      data: {
        contact: contact,
      },
    });
  } catch (error) {
    console.error('Error getting contact:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get contact',
      error: error.message,
    });
  }
};

// Create a new contact
export const createContact = async (req, res) => {
  try {
    const { name, phone_number, email, notes, categories } = req.body;

    console.log(`Creating contact`);
    console.log(`Request body:`, JSON.stringify(req.body));

    if (!name || !phone_number) {
      return res.status(400).json({
        status: false,
        message: 'Name and phone number are required',
      });
    }

    // Format phone number (remove non-numeric characters)
    const formattedPhoneNumber = phone_number.replace(/\D/g, '');

    // Create contact data object
    const contactData = {
      name,
      phone_number: formattedPhoneNumber,
      categories: categories || []
    };

    // Only add email and notes if they are provided (optional fields)
    if (email !== undefined && email !== null && email !== '') {
      contactData.email = email;
    }

    if (notes !== undefined && notes !== null && notes !== '') {
      contactData.notes = notes;
    }

    console.log('Creating contact with data:', JSON.stringify(contactData));

    // Create contact in local storage
    const { data: contact, error } = await localStorageService.createContact(contactData);

    if (error) {
      logOperation('createContact', false, error);

      if (error.message.includes('already exists')) {
        return res.status(400).json({
          status: false,
          message: error.message,
        });
      }

      throw error;
    }

    logOperation('createContact', true, null, contact);

    res.status(201).json({
      status: true,
      message: 'Contact created successfully',
      data: {
        contact,
      },
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to create contact',
      error: error.message,
    });
  }
};

// Update an existing contact
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone_number, email, notes, categories } = req.body;

    // Format phone number if provided
    const formattedPhoneNumber = phone_number ? phone_number.replace(/\D/g, '') : undefined;

    // Create update data object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (formattedPhoneNumber !== undefined) updateData.phone_number = formattedPhoneNumber;
    if (email !== undefined) updateData.email = email;
    if (notes !== undefined) updateData.notes = notes;
    if (categories !== undefined) updateData.categories = categories;

    // Update contact in local storage
    const { data: updatedContact, error } = await localStorageService.updateContact(id, updateData);

    if (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: false,
          message: 'Contact not found',
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(400).json({
          status: false,
          message: error.message,
        });
      }

      throw error;
    }

    res.json({
      status: true,
      message: 'Contact updated successfully',
      data: {
        contact: updatedContact,
      },
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to update contact',
      error: error.message,
    });
  }
};

// Delete a contact
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete contact from local storage
    const { data, error } = await localStorageService.deleteContact(id);

    if (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: false,
          message: 'Contact not found',
        });
      }

      throw error;
    }

    res.json({
      status: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete contact',
      error: error.message,
    });
  }
};

// Import contacts from CSV file
export const importContacts = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: false,
        message: 'CSV file is required',
      });
    }

    // Read the CSV file
    const results = [];
    const fileContent = fs.readFileSync(file.path);
    const readableStream = new Readable();
    readableStream.push(fileContent);
    readableStream.push(null);

    await new Promise((resolve, reject) => {
      readableStream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up the uploaded file
    fs.unlinkSync(file.path);

    if (results.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'CSV file is empty or invalid',
      });
    }

    // Validate and format the contacts
    const contactsToImport = [];
    const errors = [];

    // Process each row in the CSV
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowIndex = i + 2; // +2 because row 1 is headers, and we're 0-indexed

      // Check required fields
      if (!row.name || !row.phone_number) {
        errors.push(`Row ${rowIndex}: Name and phone number are required`);
        continue;
      }

      // Format phone number
      const formattedPhoneNumber = row.phone_number.replace(/\D/g, '');
      if (!formattedPhoneNumber) {
        errors.push(`Row ${rowIndex}: Invalid phone number`);
        continue;
      }

      // Add to contacts array
      contactsToImport.push({
        name: row.name,
        phone_number: formattedPhoneNumber,
        email: row.email || null,
        notes: row.notes || null,
      });
    }

    // If there are no valid contacts, return error
    if (contactsToImport.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'No valid contacts found in CSV',
        data: {
          errors,
        },
      });
    }

    // Import contacts using local storage service
    const { data, error } = await localStorageService.importContacts(contactsToImport);

    if (error) {
      throw error;
    }

    res.json({
      status: true,
      message: 'Contacts imported successfully',
      data: {
        imported: data.imported,
        errors: [...errors, ...(data.errors || [])],
      },
    });
  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to import contacts',
      error: error.message,
    });
  }
};
