import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

// Import controllers
import {
  getQR,
  getStatus,
  logout,
  sendMessage,
  sendMedia,
  getConfig,
  updateConfig,
  getInbox,
  getActivityLogs,
  getContactMessages,
} from '../controllers/whatsapp.js';

// Import Gemini controllers
import {
  getGeminiConfig,
  updateGeminiConfig,
  generateGeminiResponse,
  testGeminiConnection,
  validateGeminiApiKey,
  getGeminiHistory,
  clearGeminiHistory,
} from '../controllers/gemini.js';

// Import OpenAI controllers
import * as openAIController from '../controllers/openaiController.js';

// Import Groq controllers
import * as groqController from '../controllers/groqController.js';

// Import Contact controllers
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
} from '../controllers/contacts.js';

// Import Contact Category controllers
import {
  getContactCategories,
  getContactCategory,
  createContactCategory,
  updateContactCategory,
  deleteContactCategory,
  getContactsInCategory,
} from '../controllers/contactCategories.js';

// Import Item controllers
import * as itemsController from '../controllers/itemsController.js';

// Import Scheduled Message controllers
import * as scheduleController from '../controllers/scheduleController.js';


// Import middleware
import { authenticate } from '../middleware/auth.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.ensureDirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and DOC files are allowed.'));
    }
  },
});

const router = express.Router();

// WhatsApp routes
router.get('/qr', authenticate, getQR);
router.get('/status', authenticate, getStatus);
router.post('/logout', authenticate, logout);
router.post('/send-message', authenticate, sendMessage);
router.post('/send-media', authenticate, upload.single('file'), sendMedia);
router.get('/config', authenticate, getConfig);
router.post('/config', authenticate, updateConfig);
router.get('/inbox', authenticate, getInbox);
router.get('/contact/:phoneNumber/messages', authenticate, getContactMessages);
router.get('/logs', authenticate, getActivityLogs);

// Gemini routes
router.get('/gemini/config', authenticate, getGeminiConfig);
router.post('/gemini/config', authenticate, updateGeminiConfig);
router.post('/gemini/generate', authenticate, generateGeminiResponse);
router.get('/gemini/test', authenticate, testGeminiConnection);
router.post('/gemini/validate-key', validateGeminiApiKey); // No authentication for API key validation
router.get('/gemini/history/:contactId', authenticate, getGeminiHistory);
router.delete('/gemini/history/:contactId', authenticate, clearGeminiHistory);

// OpenAI routes
router.get('/openai/config', authenticate, openAIController.getConfig);
router.post('/openai/generate', authenticate, openAIController.generateResponse);

// Groq routes
router.get('/groq/config', authenticate, groqController.getConfig);
router.post('/groq/generate', authenticate, groqController.generateResponse);

// Contact routes (using new controllers)
router.get('/contacts', authenticate, getContacts);
router.get('/contacts/:id', authenticate, getContact);
router.post('/contacts', authenticate, createContact);
router.put('/contacts/:id', authenticate, updateContact);
router.delete('/contacts/:id', authenticate, deleteContact);

// Set up multer for CSV uploads
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'contacts-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const csvUpload = multer({
  storage: csvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed.'));
    }
  },
});

// Contact import route
router.post('/contacts/import', authenticate, csvUpload.single('file'), importContacts);

// Contact category routes
router.get('/contact-categories', authenticate, getContactCategories); // Authenticated
router.get('/contact-categories/:id', authenticate, getContactCategory); // Authenticated
router.post('/contact-categories', authenticate, createContactCategory); // Authenticated
router.put('/contact-categories/:id', authenticate, updateContactCategory); // Authenticated
router.delete('/contact-categories/:id', authenticate, deleteContactCategory); // Authenticated
router.get('/contact-categories/:id/contacts', authenticate, getContactsInCategory); // Authenticated

// Item routes
router.get('/items', authenticate, itemsController.getItems);
router.post('/items', authenticate, itemsController.createItem);
router.get('/items/:id', authenticate, itemsController.getItem);
router.put('/items/:id', authenticate, itemsController.updateItem);
router.delete('/items/:id', authenticate, itemsController.deleteItem);

// Scheduled Message routes
router.get('/scheduled-messages', authenticate, scheduleController.getScheduledMessages);
router.post('/scheduled-messages', authenticate, scheduleController.scheduleMessage);
router.delete('/scheduled-messages/:id', authenticate, scheduleController.deleteScheduledMessage);


export default router;