import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export type User = {
  id: string;
  email: string;
  created_at: string;
  name: string;
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  user_id: string;
};

export type Transaction = {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_id: string;
  user_id: string;
  type: 'income' | 'expense';
  category?: Category; // For joined queries
};

export type Budget = {
  id: string;
  category_id: string;
  user_id: string;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  category?: Category; // For joined queries
};

// Database service functions
export const db = {
  // Expose supabase client
  supabase,
  // User functions
  users: {
    getUser: async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as User;
    },
    updateUser: async (userId: string, updates: Partial<User>) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as User;
    }
  },

  // Categories functions
  categories: {
    getCategories: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          throw error;
        }

        return data as Category[];
      } catch (error) {
        console.error('Exception in getCategories:', error);
        throw error;
      }
    },
    createCategory: async (category: Omit<Category, 'id'>) => {
      try {
        // Validate required fields
        if (!category.name || !category.type || !category.color || !category.icon || !category.user_id) {
          throw new Error('Missing required fields for category');
        }

        const { data, error } = await supabase
          .from('categories')
          .insert(category)
          .select()
          .single();

        if (error) {
          console.error('Error creating category:', error);
          throw error;
        }

        return data as Category;
      } catch (error) {
        console.error('Exception in createCategory:', error);
        throw error;
      }
    },
    updateCategory: async (categoryId: string, updates: Partial<Category>) => {
      try {
        if (!categoryId) {
          throw new Error('Category ID is required');
        }

        const { data, error } = await supabase
          .from('categories')
          .update(updates)
          .eq('id', categoryId)
          .select()
          .single();

        if (error) {
          console.error('Error updating category:', error);
          throw error;
        }

        return data as Category;
      } catch (error) {
        console.error('Exception in updateCategory:', error);
        throw error;
      }
    },
    deleteCategory: async (categoryId: string) => {
      try {
        if (!categoryId) {
          throw new Error('Category ID is required');
        }

        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', categoryId);

        if (error) {
          console.error('Error deleting category:', error);
          throw error;
        }

        return true;
      } catch (error) {
        console.error('Exception in deleteCategory:', error);
        throw error;
      }
    }
  },

  // Transactions functions
  transactions: {
    getTransactions: async (userId: string, filters?: {
      startDate?: string,
      endDate?: string,
      categoryId?: string,
      type?: 'income' | 'expense'
    }) => {
      try {
        if (!userId) {
          throw new Error('User ID is required');
        }

        let query = supabase
          .from('transactions')
          .select(`
            *,
            category:categories(*)
          `)
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (filters?.startDate) {
          query = query.gte('date', filters.startDate);
        }

        if (filters?.endDate) {
          query = query.lte('date', filters.endDate);
        }

        if (filters?.categoryId) {
          query = query.eq('category_id', filters.categoryId);
        }

        if (filters?.type) {
          query = query.eq('type', filters.type);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching transactions:', error);
          throw error;
        }

        return data as Transaction[];
      } catch (error) {
        console.error('Exception in getTransactions:', error);
        throw error;
      }
    },
    createTransaction: async (transaction: Omit<Transaction, 'id' | 'category'>) => {
      try {
        // Validate required fields
        if (!transaction.amount || !transaction.date || !transaction.category_id || !transaction.user_id || !transaction.type) {
          throw new Error('Missing required fields for transaction');
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert(transaction)
          .select()
          .single();

        if (error) {
          console.error('Error creating transaction:', error);
          throw error;
        }

        return data as Transaction;
      } catch (error) {
        console.error('Exception in createTransaction:', error);
        throw error;
      }
    },
    updateTransaction: async (transactionId: string, updates: Partial<Omit<Transaction, 'id' | 'category'>>) => {
      try {
        if (!transactionId) {
          throw new Error('Transaction ID is required');
        }

        const { data, error } = await supabase
          .from('transactions')
          .update(updates)
          .eq('id', transactionId)
          .select()
          .single();

        if (error) {
          console.error('Error updating transaction:', error);
          throw error;
        }

        return data as Transaction;
      } catch (error) {
        console.error('Exception in updateTransaction:', error);
        throw error;
      }
    },
    deleteTransaction: async (transactionId: string) => {
      try {
        if (!transactionId) {
          throw new Error('Transaction ID is required');
        }

        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId);

        if (error) {
          console.error('Error deleting transaction:', error);
          throw error;
        }

        return true;
      } catch (error) {
        console.error('Exception in deleteTransaction:', error);
        throw error;
      }
    }
  },

  // Budgets functions
  budgets: {
    getBudgets: async (userId: string, period?: 'monthly' | 'yearly') => {
      let query = supabase
        .from('budgets')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId);

      if (period) {
        query = query.eq('period', period);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Budget[];
    },
    createBudget: async (budget: Omit<Budget, 'id' | 'category'>) => {
      const { data, error } = await supabase
        .from('budgets')
        .insert(budget)
        .select()
        .single();

      if (error) throw error;
      return data as Budget;
    },
    updateBudget: async (budgetId: string, updates: Partial<Omit<Budget, 'id' | 'category'>>) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;
      return data as Budget;
    },
    deleteBudget: async (budgetId: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;
      return true;
    }
  },

  // Dashboard summary
  dashboard: {
    getSummary: async (userId: string, startDate: string, endDate: string) => {
      // Get transactions for the period
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (transactionsError) throw transactionsError;

      // Calculate totals
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        income,
        expenses,
        balance: income - expenses,
        transactionCount: transactions.length
      };
    }
  }
};
