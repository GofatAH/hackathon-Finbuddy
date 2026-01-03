import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: 'needs' | 'wants' | 'savings';
  merchant: string | null;
  description: string | null;
  expense_date: string;
  created_at: string;
}

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel('expenses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newExpense = {
                ...payload.new,
                amount: Number(payload.new.amount),
                category: payload.new.category as 'needs' | 'wants' | 'savings'
              } as Expense;
              setExpenses(prev => [newExpense, ...prev]);
            } else if (payload.eventType === 'DELETE') {
              setExpenses(prev => prev.filter(e => e.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
              setExpenses(prev => prev.map(e => 
                e.id === payload.new.id 
                  ? { ...payload.new, amount: Number(payload.new.amount), category: payload.new.category as 'needs' | 'wants' | 'savings' } as Expense
                  : e
              ));
            }
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setExpenses([]);
      setLoading(false);
    }
  }, [user]);

  const fetchExpenses = async () => {
    if (!user) return;
    
    try {
      // Get current month expenses
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', startOfMonth.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      
      setExpenses(data.map(e => ({
        ...e,
        amount: Number(e.amount),
        category: e.category as 'needs' | 'wants' | 'savings'
      })));
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (expense: {
    amount: number;
    category: 'needs' | 'wants' | 'savings';
    merchant?: string;
    description?: string;
    expense_date?: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: expense.amount,
          category: expense.category,
          merchant: expense.merchant || null,
          description: expense.description || null,
          expense_date: expense.expense_date || new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newExpense = {
        ...data,
        amount: Number(data.amount),
        category: data.category as 'needs' | 'wants' | 'savings'
      };
      
      setExpenses(prev => [newExpense, ...prev]);
      return { data: newExpense, error: null };
    } catch (error) {
      console.error('Error adding expense:', error);
      return { error: error as Error };
    }
  };

  const updateExpense = async (id: string, updates: {
    amount?: number;
    category?: 'needs' | 'wants' | 'savings';
    merchant?: string;
    description?: string;
    expense_date?: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedExpense = {
        ...data,
        amount: Number(data.amount),
        category: data.category as 'needs' | 'wants' | 'savings'
      };
      
      setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
      return { data: updatedExpense, error: null };
    } catch (error) {
      console.error('Error updating expense:', error);
      return { error: error as Error };
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setExpenses(prev => prev.filter(e => e.id !== id));
      return { error: null };
    } catch (error) {
      console.error('Error deleting expense:', error);
      return { error: error as Error };
    }
  };

  const getSpendingByCategory = () => {
    const totals = { needs: 0, wants: 0, savings: 0 };
    
    expenses.forEach(expense => {
      totals[expense.category] += expense.amount;
    });
    
    return totals;
  };

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    getSpendingByCategory,
    refetch: fetchExpenses
  };
}
