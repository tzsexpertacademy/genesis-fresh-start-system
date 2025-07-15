import { supabase } from '../lib/supabase';

export const contactService = {
  // Contact methods
  async getContacts() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  },

  async createContact(contact: any) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  },

  async updateContact(id: string, contact: any) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(contact)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  async deleteContact(id: string) {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  },

  // Contact Category methods
  async getContactCategories() {
    try {
      const { data, error } = await supabase
        .from('contact_categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contact categories:', error);
      return [];
    }
  },

  async createContactCategory(category: any) {
    try {
      const { data, error } = await supabase
        .from('contact_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating contact category:', error);
      throw error;
    }
  },

  async updateContactCategory(id: string, category: any) {
    try {
      const { data, error } = await supabase
        .from('contact_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating contact category:', error);
      throw error;
    }
  },

  async deleteContactCategory(id: string) {
    try {
      const { error } = await supabase
        .from('contact_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting contact category:', error);
      throw error;
    }
  },

  async getContactsInCategory(categoryId: string) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('category_id', categoryId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contacts in category:', error);
      return [];
    }
  },

  // Utility methods
  cleanPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  },

  formatPhoneNumber(phone: string): string {
    const cleaned = this.cleanPhoneNumber(phone);
    return cleaned.startsWith('55') ? `+${cleaned}` : `+55${cleaned}`;
  },

  async importContacts(contacts: any[]) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contacts)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error importing contacts:', error);
      throw error;
    }
  }
};