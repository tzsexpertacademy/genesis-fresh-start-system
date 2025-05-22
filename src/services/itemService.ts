import { apiRequest } from './whatsappService'; // Reusing the apiRequest from whatsappService
import { Item } from '../types/whatsapp';

// Get all items
export const getItems = async (): Promise<{ status: boolean; message: string; data?: { items: Item[] } }> => {
  return apiRequest('/items');
};

// Get a single item by ID
export const getItem = async (id: string): Promise<{ status: boolean; message: string; data?: { item: Item } }> => {
  return apiRequest(`/items/${id}`);
};

// Create a new item
export const createItem = async (itemData: {
  name: string;
  description?: string;
  type: 'product' | 'service' | 'other';
  price?: number;
}): Promise<{ status: boolean; message: string; data?: { item: Item } }> => {
  return apiRequest('/items', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
};

// Update an existing item
export const updateItem = async (
  id: string,
  itemData: Partial<{
    name: string;
    description: string;
    type: 'product' | 'service' | 'other';
    price: number | null; // Allow null to clear price
  }>
): Promise<{ status: boolean; message: string; data?: { item: Item } }> => {
  return apiRequest(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(itemData),
  });
};

// Delete an item
export const deleteItem = async (id: string): Promise<{ status: boolean; message: string; data?: { success: boolean } }> => {
  return apiRequest(`/items/${id}`, {
    method: 'DELETE',
  });
};