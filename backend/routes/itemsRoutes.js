import express from 'express';
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} from '../controllers/itemsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all item routes
router.use(authenticate);

router.get('/', getItems);
router.post('/', createItem);
router.get('/:id', getItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;