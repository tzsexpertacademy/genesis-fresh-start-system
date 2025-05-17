// Local database types and functions for WhatsApp Gateway
// This replaces the Supabase implementation with a local version

// Types for WhatsApp contacts
export type WhatsAppContact = {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
  categories?: string[];
  created_at: string;
  updated_at: string;
};

// Types for WhatsApp contact categories
export type WhatsAppContactCategory = {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
  contact_count?: number;
};

// Dummy user for compatibility with existing code
export const dummyUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'user@example.com',
  name: 'Local User',
  created_at: new Date().toISOString()
};

// Local database service
export const localDb = {
  // Dummy auth functions for compatibility
  auth: {
    getUser: async () => {
      return { data: { user: dummyUser }, error: null };
    },
    getSession: async () => {
      return { data: { session: { user: dummyUser } }, error: null };
    },
    onAuthStateChange: () => {
      return { data: { subscription: null } };
    },
    signOut: async () => {
      return { error: null };
    }
  }
};

// Export the localDb as a replacement for supabase
export const supabase = localDb;

// Export types for compatibility with existing code
export type User = {
  id: string;
  email: string;
  created_at: string;
  name: string;
};

// Export db object for compatibility with existing code
export const db = {
  supabase: localDb
};
