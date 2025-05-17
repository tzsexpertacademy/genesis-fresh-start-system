import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES module compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to contacts file
const contactsFilePath = path.join(__dirname, 'contacts.json');

// Default contacts if file doesn't exist
const defaultContacts = {
  contacts: [],
  groups: []
};

/**
 * Load contacts from file
 * @returns {Object} Contacts object with contacts and groups arrays
 */
function loadContacts() {
  try {
    if (fs.existsSync(contactsFilePath)) {
      const data = fs.readFileSync(contactsFilePath, 'utf8');
      return JSON.parse(data);
    } else {
      // If file doesn't exist, create it with default contacts
      saveContacts(defaultContacts);
      return defaultContacts;
    }
  } catch (error) {
    console.error('Error loading contacts:', error);
    return defaultContacts;
  }
}

/**
 * Save contacts to file
 * @param {Object} contacts Contacts object with contacts and groups arrays
 */
function saveContacts(contacts) {
  try {
    fs.writeFileSync(contactsFilePath, JSON.stringify(contacts, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving contacts:', error);
  }
}

/**
 * Get all contacts
 * @returns {Array} Array of contact objects
 */
export function getAllContacts() {
  const data = loadContacts();
  return data.contacts;
}

/**
 * Get contact by ID
 * @param {string} id Contact ID
 * @returns {Object|null} Contact object or null if not found
 */
export function getContactById(id) {
  const contacts = getAllContacts();
  return contacts.find(contact => contact.id === id) || null;
}

/**
 * Get contact by phone number
 * @param {string} phoneNumber Phone number
 * @returns {Object|null} Contact object or null if not found
 */
export function getContactByPhone(phoneNumber) {
  const contacts = getAllContacts();
  return contacts.find(contact => contact.phoneNumber === phoneNumber) || null;
}

/**
 * Add new contact
 * @param {Object} contact Contact object
 * @returns {Object} Added contact with generated ID
 */
export function addContact(contact) {
  const data = loadContacts();
  
  // Generate ID if not provided
  if (!contact.id) {
    const maxId = data.contacts.reduce((max, c) => {
      const id = parseInt(c.id);
      return isNaN(id) ? max : Math.max(max, id);
    }, 0);
    contact.id = (maxId + 1).toString();
  }
  
  // Add timestamp if not provided
  if (!contact.lastContact) {
    contact.lastContact = new Date().toISOString();
  }
  
  data.contacts.push(contact);
  saveContacts(data);
  return contact;
}

/**
 * Update existing contact
 * @param {string} id Contact ID
 * @param {Object} updatedContact Updated contact data
 * @returns {Object|null} Updated contact or null if not found
 */
export function updateContact(id, updatedContact) {
  const data = loadContacts();
  const index = data.contacts.findIndex(contact => contact.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Preserve the ID
  updatedContact.id = id;
  
  // Update the contact
  data.contacts[index] = { ...data.contacts[index], ...updatedContact };
  saveContacts(data);
  return data.contacts[index];
}

/**
 * Delete contact
 * @param {string} id Contact ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteContact(id) {
  const data = loadContacts();
  const initialLength = data.contacts.length;
  
  data.contacts = data.contacts.filter(contact => contact.id !== id);
  
  // Also remove from all groups
  data.groups.forEach(group => {
    group.members = group.members.filter(memberId => memberId !== id);
  });
  
  saveContacts(data);
  return data.contacts.length < initialLength;
}

/**
 * Get all groups
 * @returns {Array} Array of group objects
 */
export function getAllGroups() {
  const data = loadContacts();
  return data.groups;
}

/**
 * Get group by ID
 * @param {string} id Group ID
 * @returns {Object|null} Group object or null if not found
 */
export function getGroupById(id) {
  const groups = getAllGroups();
  return groups.find(group => group.id === id) || null;
}

/**
 * Add new group
 * @param {Object} group Group object
 * @returns {Object} Added group with generated ID
 */
export function addGroup(group) {
  const data = loadContacts();
  
  // Generate ID if not provided
  if (!group.id) {
    const maxId = data.groups.reduce((max, g) => {
      const id = g.id.startsWith('g') ? parseInt(g.id.substring(1)) : 0;
      return isNaN(id) ? max : Math.max(max, id);
    }, 0);
    group.id = `g${maxId + 1}`;
  }
  
  // Initialize members array if not provided
  if (!group.members) {
    group.members = [];
  }
  
  data.groups.push(group);
  saveContacts(data);
  return group;
}

/**
 * Update existing group
 * @param {string} id Group ID
 * @param {Object} updatedGroup Updated group data
 * @returns {Object|null} Updated group or null if not found
 */
export function updateGroup(id, updatedGroup) {
  const data = loadContacts();
  const index = data.groups.findIndex(group => group.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Preserve the ID
  updatedGroup.id = id;
  
  // Update the group
  data.groups[index] = { ...data.groups[index], ...updatedGroup };
  saveContacts(data);
  return data.groups[index];
}

/**
 * Delete group
 * @param {string} id Group ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteGroup(id) {
  const data = loadContacts();
  const initialLength = data.groups.length;
  
  data.groups = data.groups.filter(group => group.id !== id);
  saveContacts(data);
  return data.groups.length < initialLength;
}

/**
 * Add contact to group
 * @param {string} groupId Group ID
 * @param {string} contactId Contact ID
 * @returns {boolean} True if added, false if group not found or contact already in group
 */
export function addContactToGroup(groupId, contactId) {
  const data = loadContacts();
  const groupIndex = data.groups.findIndex(group => group.id === groupId);
  
  if (groupIndex === -1) {
    return false;
  }
  
  // Check if contact exists
  const contactExists = data.contacts.some(contact => contact.id === contactId);
  if (!contactExists) {
    return false;
  }
  
  // Check if contact already in group
  if (data.groups[groupIndex].members.includes(contactId)) {
    return false;
  }
  
  data.groups[groupIndex].members.push(contactId);
  saveContacts(data);
  return true;
}

/**
 * Remove contact from group
 * @param {string} groupId Group ID
 * @param {string} contactId Contact ID
 * @returns {boolean} True if removed, false if group not found or contact not in group
 */
export function removeContactFromGroup(groupId, contactId) {
  const data = loadContacts();
  const groupIndex = data.groups.findIndex(group => group.id === groupId);
  
  if (groupIndex === -1) {
    return false;
  }
  
  const initialLength = data.groups[groupIndex].members.length;
  data.groups[groupIndex].members = data.groups[groupIndex].members.filter(id => id !== contactId);
  
  saveContacts(data);
  return data.groups[groupIndex].members.length < initialLength;
}

// Initialize contacts file if it doesn't exist
loadContacts();

export default {
  getAllContacts,
  getContactById,
  getContactByPhone,
  addContact,
  updateContact,
  deleteContact,
  getAllGroups,
  getGroupById,
  addGroup,
  updateGroup,
  deleteGroup,
  addContactToGroup,
  removeContactFromGroup
};
