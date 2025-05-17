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
} from '../controllers/gemini.js';


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

// Import contacts routes
import contactsRoutes from './contacts.js';

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

// WebSocket is now used for real-time notifications instead of SSE

// Gemini routes
router.get('/gemini/config', authenticate, getGeminiConfig);
router.post('/gemini/config', authenticate, updateGeminiConfig);
router.post('/gemini/generate', authenticate, generateGeminiResponse);
router.get('/gemini/test', authenticate, testGeminiConnection);
router.post('/gemini/validate-key', validateGeminiApiKey); // No authentication for API key validation


// Contact routes
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
router.get('/contact-categories', getContactCategories);
router.get('/contact-categories/:id', getContactCategory);
router.post('/contact-categories', createContactCategory);
router.put('/contact-categories/:id', updateContactCategory);
router.delete('/contact-categories/:id', deleteContactCategory);
router.get('/contact-categories/:id/contacts', getContactsInCategory);

// Use contacts routes
router.use('/contacts-management', contactsRoutes);

export default router;
