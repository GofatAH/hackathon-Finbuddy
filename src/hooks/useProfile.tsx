import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PersonalityType } from '@/lib/personalities';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  monthly_income: number;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  personality: PersonalityType;
  onboarding_completed: boolean;
  avatar_url: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setProfile({
        ...data,
        monthly_income: Number(data.monthly_income),
        personality: data.personality as PersonalityType,
        avatar_url: data.avatar_url
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'user_id'>>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error: error as Error };
    }
  };

  const getBudgetAmounts = () => {
    if (!profile) {
      return { needs: 0, wants: 0, savings: 0 };
    }
    
    const income = profile.monthly_income;
    return {
      needs: (income * profile.needs_percentage) / 100,
      wants: (income * profile.wants_percentage) / 100,
      savings: (income * profile.savings_percentage) / 100,
    };
  };

  return {
    profile,
    loading,
    updateProfile,
    getBudgetAmounts,
    refetch: fetchProfile
  };
}
