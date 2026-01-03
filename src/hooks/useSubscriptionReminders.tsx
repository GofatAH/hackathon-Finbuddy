import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useSubscriptionReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (user && !hasChecked.current) {
      hasChecked.current = true;
      checkUpcomingSubscriptions();
    }
  }, [user]);

  const checkUpcomingSubscriptions = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('name, amount, next_charge_date, is_trial, trial_end_date')
        .eq('user_id', user.id)
        .gte('next_charge_date', today.toISOString().split('T')[0])
        .lte('next_charge_date', threeDaysFromNow.toISOString().split('T')[0]);

      if (error) throw error;

      if (data && data.length > 0) {
        // Show reminder for each upcoming subscription
        data.forEach((sub, index) => {
          const chargeDate = new Date(sub.next_charge_date);
          const daysUntil = Math.ceil((chargeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          const dayText = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

          setTimeout(() => {
            toast({
              title: `💳 ${sub.name} renews ${dayText}`,
              description: `$${Number(sub.amount).toFixed(2)} will be charged`,
              duration: 6000,
            });
          }, index * 1500); // Stagger notifications
        });
      }

      // Check for trials ending soon
      const { data: trialData, error: trialError } = await supabase
        .from('subscriptions')
        .select('name, amount, trial_end_date')
        .eq('user_id', user.id)
        .eq('is_trial', true)
        .gte('trial_end_date', today.toISOString().split('T')[0])
        .lte('trial_end_date', threeDaysFromNow.toISOString().split('T')[0]);

      if (trialError) throw trialError;

      if (trialData && trialData.length > 0) {
        trialData.forEach((sub, index) => {
          const endDate = new Date(sub.trial_end_date!);
          const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          const dayText = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

          setTimeout(() => {
            toast({
              title: `⚡ ${sub.name} trial ends ${dayText}`,
              description: `Cancel before it renews at $${Number(sub.amount).toFixed(2)}/mo`,
              duration: 8000,
            });
          }, (data?.length || 0) * 1500 + (index + 1) * 1500);
        });
      }
    } catch (error) {
      console.error('Error checking subscriptions:', error);
    }
  };
}