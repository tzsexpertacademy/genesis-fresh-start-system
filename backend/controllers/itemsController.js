import * as localStorageService from '../services/localStorageService.js';

// Helper function to log operations for debugging
const logOperation = (operation, success, error = null, data = null) => {
  console.log(`ItemController - ${operation}: ${success ? 'Success' : 'Failed'}`);
  if (error) {
    console.error(`ItemController - ${operation} Error:`, error);
  }
  if (data && process.env.NODE_ENV === 'development') {
    const preview = JSON.stringify(data).substring(0, 200);
    console.log(`ItemController - ${operation} Data Preview:`, preview + (preview.length === 200 ? '...' : ''));
  }
};

// Get all items
export const getItems = async (req, res) => {
  try {
    const { data: items, error } = await localStorageService.getItems();
    if (error) {
      logOperation('getItems', false, error);
      throw error;
    }
    logOperation('getItems', true, null, { count: items.length });
    res.json({ status: true, message: 'Items retrieved successfully', data: { items } });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to get items', error: error.message });
  }
};

// Get a single item by ID
export const getItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: item, error } = await localStorageService.getItem(id);
    if (error) {
      logOperation('getItem', false, error, { id });
      throw error;
    }
    if (!item) {
      logOperation('getItem', false, { message: 'Item not found' }, { id });
      return res.status(404).json({ status: false, message: 'Item not found' });
    }
    logOperation('getItem', true, null, item);
    res.json({ status: true, message: 'Item retrieved successfully', data: { item } });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to get item', error: error.message });
  }
};

// Create a new item
export const createItem = async (req, res) => {
  try {
    const { name, description, type, price } = req.body;
    if (!name || !type) {
      return res.status(400).json({ status: false, message: 'Name and type are required' });
    }
    const itemData = { name, description: description || '', type, price: price ? parseFloat(price) : undefined };
    const { data: item, error } = await localStorageService.createItem(itemData);
    if (error) {
      logOperation('createItem', false, error, itemData);
      throw error;
    }
    logOperation('createItem', true, null, item);
    res.status(201).json({ status: true, message: 'Item created successfully', data: { item } });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to create item', error: error.message });
  }
};

// Update an existing item
export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, price } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (price !== undefined) updateData.price = price ? parseFloat(price) : null; // Allow clearing price

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ status: false, message: 'No update data provided' });
    }

    const { data: updatedItem, error } = await localStorageService.updateItem(id, updateData);
    if (error) {
      if (error.message.includes('not found')) {
        logOperation('updateItem', false, { message: 'Item not found' }, { id });
        return res.status(404).json({ status: false, message: 'Item not found' });
      }
      logOperation('updateItem', false, error, { id, ...updateData });
      throw error;
    }
    logOperation('updateItem', true, null, updatedItem);
    res.json({ status: true, message: 'Item updated successfully', data: { item: updatedItem } });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to update item', error: error.message });
  }
};

// Delete an item
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await localStorageService.deleteItem(id);
    if (error) {
      if (error.message.includes('not found')) {
        logOperation('deleteItem', false, { message: 'Item not found' }, { id });
        return res.status(404).json({ status: false, message: 'Item not found' });
      }
      logOperation('deleteItem', false, error, { id });
      throw error;
    }
    logOperation('deleteItem', true, null, { id });
    res.json({ status: true, message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to delete item', error: error.message });
  }
};