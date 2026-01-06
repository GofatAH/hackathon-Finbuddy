import { useEffect, useRef, useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getNotificationTitle, getNotificationBody, getNotificationType, NotificationKey } from '@/lib/notification-messages';
import { format, isToday, differenceInDays } from 'date-fns';

const WELCOME_SHOWN_KEY = 'finbuddy_welcome_shown';
const LAST_VISIT_KEY = 'finbuddy_last_visit';

export function useWelcomeNotifications() {
  const { user } = useAuth();
  const { profile, getBudgetAmounts } = useProfile();
  const { getSpendingByCategory } = useExpenses();
  const { showPopup } = useNotifications();
  const hasShownWelcome = useRef(false);

  const showWelcomeNotification = useCallback(async () => {
    if (!user || !profile || hasShownWelcome.current) return;
    
    // Check if we already showed a welcome this session
    const sessionWelcomeShown = sessionStorage.getItem(WELCOME_SHOWN_KEY);
    if (sessionWelcomeShown) {
      hasShownWelcome.current = true;
      return;
    }

    const personality = profile.personality || 'chill';
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const justLoggedIn = sessionStorage.getItem('just_logged_in');
    const justSignedUp = sessionStorage.getItem('just_signed_up');

    // Clear the login/signup flags
    sessionStorage.removeItem('just_logged_in');
    sessionStorage.removeItem('just_signed_up');

    // Determine which notification to show
    let notificationKey: NotificationKey | null = null;
    let data: Record<string, unknown> = {};

    // Priority 1: First time signup
    if (justSignedUp) {
      notificationKey = 'welcome_first_time';
    }
    // Priority 2: Just logged in (returning user)
    else if (justLoggedIn) {
      notificationKey = 'welcome_returning';
    }
    // Priority 3: Check for subscriptions due today
    else {
      try {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id);

        if (subs && subs.length > 0) {
          const todaysSubs = subs.filter(s => isToday(new Date(s.next_charge_date)));
          if (todaysSubs.length > 0) {
            notificationKey = 'subscription_reminder_today';
            data = {
              name: todaysSubs[0].name,
              amount: todaysSubs[0].amount,
              count: todaysSubs.length
            };
          }

          // Check for trials ending soon
          if (!notificationKey) {
            const trialsEndingSoon = subs.filter(s => {
              if (!s.is_trial || !s.trial_end_date) return false;
              const daysLeft = differenceInDays(new Date(s.trial_end_date), new Date());
              return daysLeft >= 0 && daysLeft <= 3;
            });
            
            if (trialsEndingSoon.length > 0) {
              notificationKey = 'trial_ending';
              const daysLeft = differenceInDays(new Date(trialsEndingSoon[0].trial_end_date!), new Date());
              data = {
                name: trialsEndingSoon[0].name,
                days: daysLeft === 0 ? 'today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`
              };
            }
          }
        }
      } catch (e) {
        console.error('Error checking subscriptions for welcome:', e);
      }
    }

    // Priority 4: Budget quick update (if no other notification)
    if (!notificationKey) {
      const spending = getSpendingByCategory();
      const budgets = getBudgetAmounts();
      
      // Check which category has highest spending percentage
      const categories = ['needs', 'wants', 'savings'] as const;
      let highestPercentage = 0;
      let highestCategory = '';
      
      for (const cat of categories) {
        if (budgets[cat] > 0) {
          const percentage = Math.round((spending[cat] / budgets[cat]) * 100);
          if (percentage > highestPercentage) {
            highestPercentage = percentage;
            highestCategory = cat;
          }
        }
      }

      if (highestPercentage >= 80) {
        notificationKey = 'quick_budget_update';
        data = {
          category: highestCategory.charAt(0).toUpperCase() + highestCategory.slice(1),
          percentage: highestPercentage
        };
      }
    }

    // Priority 5: Random daily motivation (fallback)
    if (!notificationKey && lastVisit) {
      const lastVisitDate = new Date(lastVisit);
      if (!isToday(lastVisitDate)) {
        notificationKey = 'daily_motivation';
      }
    }

    // Show the notification after a short delay
    if (notificationKey) {
      hasShownWelcome.current = true;
      sessionStorage.setItem(WELCOME_SHOWN_KEY, 'true');
      
      setTimeout(() => {
        showPopup({
          type: getNotificationType(notificationKey!),
          title: getNotificationTitle(notificationKey!, personality),
          body: getNotificationBody(notificationKey!, personality, data),
          duration: 5000
        });
      }, 1500);
    }

    // Update last visit time
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  }, [user, profile, showPopup, getBudgetAmounts, getSpendingByCategory]);

  useEffect(() => {
    if (user && profile) {
      // Small delay to let the UI settle
      const timer = setTimeout(showWelcomeNotification, 500);
      return () => clearTimeout(timer);
    }
  }, [user, profile, showWelcomeNotification]);

  return { showWelcomeNotification };
}
