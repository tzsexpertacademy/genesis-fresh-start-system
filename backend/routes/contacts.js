import express from 'express';
import * as contactsService from '../contacts.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all contacts
router.get('/', (req, res) => {
  try {
    const contacts = contactsService.getAllContacts();
    res.json({
      status: true,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error retrieving contacts',
      error: error.message
    });
  }
});

// Get contact by ID
router.get('/:id', (req, res) => {
  try {
    const contact = contactsService.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        status: false,
        message: 'Contact not found'
      });
    }
    res.json({
      status: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error retrieving contact',
      error: error.message
    });
  }
});

// Create new contact
router.post('/', (req, res) => {
  try {
    const newContact = contactsService.addContact(req.body);
    res.status(201).json({
      status: true,
      message: 'Contact created successfully',
      data: newContact
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error creating contact',
      error: error.message
    });
  }
});

// Update contact
router.put('/:id', (req, res) => {
  try {
    const updatedContact = contactsService.updateContact(req.params.id, req.body);
    if (!updatedContact) {
      return res.status(404).json({
        status: false,
        message: 'Contact not found'
      });
    }
    res.json({
      status: true,
      message: 'Contact updated successfully',
      data: updatedContact
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
});

// Delete contact
router.delete('/:id', (req, res) => {
  try {
    const deleted = contactsService.deleteContact(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: 'Contact not found'
      });
    }
    res.json({
      status: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
});

// Get all groups
router.get('/groups/all', (req, res) => {
  try {
    const groups = contactsService.getAllGroups();
    res.json({
      status: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error retrieving groups',
      error: error.message
    });
  }
});

// Get group by ID
router.get('/groups/:id', (req, res) => {
  try {
    const group = contactsService.getGroupById(req.params.id);
    if (!group) {
      return res.status(404).json({
        status: false,
        message: 'Group not found'
      });
    }
    res.json({
      status: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error retrieving group',
      error: error.message
    });
  }
});

// Create new group
router.post('/groups', (req, res) => {
  try {
    const newGroup = contactsService.addGroup(req.body);
    res.status(201).json({
      status: true,
      message: 'Group created successfully',
      data: newGroup
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error creating group',
      error: error.message
    });
  }
});

// Update group
router.put('/groups/:id', (req, res) => {
  try {
    const updatedGroup = contactsService.updateGroup(req.params.id, req.body);
    if (!updatedGroup) {
      return res.status(404).json({
        status: false,
        message: 'Group not found'
      });
    }
    res.json({
      status: true,
      message: 'Group updated successfully',
      data: updatedGroup
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error updating group',
      error: error.message
    });
  }
});

// Delete group
router.delete('/groups/:id', (req, res) => {
  try {
    const deleted = contactsService.deleteGroup(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: 'Group not found'
      });
    }
    res.json({
      status: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error deleting group',
      error: error.message
    });
  }
});

// Add contact to group
router.post('/groups/:groupId/contacts/:contactId', (req, res) => {
  try {
    const added = contactsService.addContactToGroup(req.params.groupId, req.params.contactId);
    if (!added) {
      return res.status(404).json({
        status: false,
        message: 'Group or contact not found, or contact already in group'
      });
    }
    res.json({
      status: true,
      message: 'Contact added to group successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error adding contact to group',
      error: error.message
    });
  }
});

// Remove contact from group
router.delete('/groups/:groupId/contacts/:contactId', (req, res) => {
  try {
    const removed = contactsService.removeContactFromGroup(req.params.groupId, req.params.contactId);
    if (!removed) {
      return res.status(404).json({
        status: false,
        message: 'Group or contact not found, or contact not in group'
      });
    }
    res.json({
      status: true,
      message: 'Contact removed from group successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error removing contact from group',
      error: error.message
    });
  }
});

export default router;
