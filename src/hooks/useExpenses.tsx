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
    getSpendingByCategory,
    refetch: fetchExpenses
  };
}
