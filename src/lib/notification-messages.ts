import { PersonalityType } from './personalities';
import { NotificationType } from '@/hooks/useNotifications';

export type NotificationKey = 
  | 'budget_warning_80'
  | 'budget_exceeded_100'
  | 'subscription_reminder'
  | 'subscription_reminder_today'
  | 'trial_ending'
  | 'expense_logged'
  | 'first_expense'
  | 'streak_3_days'
  | 'under_budget'
  | 'welcome_first_time'
  | 'welcome_returning'
  | 'daily_motivation'
  | 'quick_budget_update';

interface NotificationTemplate {
  title: Record<PersonalityType, string>;
  body: Record<PersonalityType, (data: Record<string, unknown>) => string>;
}

const templates: Record<NotificationKey, NotificationTemplate> = {
  budget_warning_80: {
    title: {
      chill: 'Heads Up 🤙',
      hype: 'WHOA! BUDGET ALERT! 🔥',
      straight: 'Budget Warning',
      supportive: 'Gentle Reminder 💚'
    },
    body: {
      chill: (d) => `Yo, ${d.category} at ${d.percentage}% — we getting close bro`,
      hype: (d) => `${d.percentage}% on ${d.category}! Time to CHILL on spending!`,
      straight: (d) => `${d.category}: ${d.percentage}%. Approaching limit.`,
      supportive: (d) => `You're at ${d.percentage}% of ${d.category}. You've got this!`
    }
  },
  budget_exceeded_100: {
    title: {
      chill: 'Oof, We Over 😅',
      hype: '🚨 BUDGET BUSTED! 🚨',
      straight: 'Budget Exceeded',
      supportive: 'Budget Check-In 💛'
    },
    body: {
      chill: (d) => `${d.category} went ${d.overBy}% over... no stress, just be mindful`,
      hype: (d) => `${d.category} is ${d.overBy}% OVER! Time to LOCK IN!`,
      straight: (d) => `${d.category} exceeded by ${d.overBy}%.`,
      supportive: (d) => `${d.category} went over by ${d.overBy}%. Tomorrow is a new day!`
    }
  },
  subscription_reminder: {
    title: {
      chill: 'Sub Coming Up 💰',
      hype: 'CHARGE INCOMING! 💸',
      straight: 'Subscription Due',
      supportive: 'Subscription Reminder 📅'
    },
    body: {
      chill: (d) => `${d.name} ($${d.amount}) renews ${d.when} — still using it?`,
      hype: (d) => `${d.name} charging $${d.amount} ${d.when}! Still WORTH IT?!`,
      straight: (d) => `${d.name}: $${d.amount} due ${d.when}.`,
      supportive: (d) => `Just a heads up — ${d.name} ($${d.amount}) renews ${d.when}`
    }
  },
  trial_ending: {
    title: {
      chill: 'Trial Almost Done ⏰',
      hype: 'TRIAL ENDING SOON! ⚡',
      straight: 'Trial Expiring',
      supportive: 'Trial Ending Soon 💫'
    },
    body: {
      chill: (d) => `${d.name} trial ends in ${d.days} days — cancel if you don't need it`,
      hype: (d) => `${d.name} trial ends in ${d.days} DAYS! Decision time!`,
      straight: (d) => `${d.name} trial: ${d.days} days remaining.`,
      supportive: (d) => `Your ${d.name} trial ends in ${d.days} days. Take your time deciding!`
    }
  },
  expense_logged: {
    title: {
      chill: 'Logged ✌️',
      hype: 'EXPENSE TRACKED! 🎯',
      straight: 'Expense Added',
      supportive: 'Great Job! ✨'
    },
    body: {
      chill: (d) => `$${d.amount} for ${d.merchant || d.category} — got it`,
      hype: (d) => `$${d.amount} at ${d.merchant || d.category} LOCKED IN!`,
      straight: (d) => `$${d.amount} - ${d.category}`,
      supportive: (d) => `Added $${d.amount} for ${d.merchant || d.category}. Keep it up!`
    }
  },
  first_expense: {
    title: {
      chill: 'First One Down! 🙌',
      hype: 'FIRST EXPENSE! LET\'S GOOO! 🚀',
      straight: 'First Expense Logged',
      supportive: 'You Did It! 🎉'
    },
    body: {
      chill: (_d) => `You just logged your first expense — welcome to the squad`,
      hype: (_d) => `Your financial journey STARTS NOW! Keep that energy!`,
      straight: (_d) => `First expense recorded. Continue tracking.`,
      supportive: (_d) => `So proud of you for starting your tracking journey!`
    }
  },
  streak_3_days: {
    title: {
      chill: '3 Days Strong 💪',
      hype: '3 DAY STREAK! 🔥🔥🔥',
      straight: '3-Day Streak',
      supportive: 'Amazing Streak! 🌟'
    },
    body: {
      chill: (_d) => `You've logged expenses 3 days in a row — keep vibin'`,
      hype: (_d) => `THREE DAYS of tracking! You're UNSTOPPABLE!`,
      straight: (_d) => `3 consecutive days of expense tracking.`,
      supportive: (_d) => `3 days of tracking! You're building great habits!`
    }
  },
  under_budget: {
    title: {
      chill: 'Nice Work 🤙',
      hype: 'CRUSHING IT! 💪',
      straight: 'Under Budget',
      supportive: 'Wonderful News! 💚'
    },
    body: {
      chill: (d) => `${d.category} still has ${d.remaining}% left — you're chillin'`,
      hype: (d) => `${d.remaining}% LEFT in ${d.category}! MONEY MASTER!`,
      straight: (d) => `${d.category}: ${d.remaining}% remaining.`,
      supportive: (d) => `You still have ${d.remaining}% of ${d.category} left. Great job!`
    }
  },
  welcome_first_time: {
    title: {
      chill: 'Welcome to the Crew! 🙌',
      hype: 'WELCOME TO FINBUDDY! 🚀🔥',
      straight: 'Welcome',
      supportive: 'So Happy You\'re Here! 💚'
    },
    body: {
      chill: (_d) => `Yo! You're all set up. Start logging expenses by just typing naturally`,
      hype: (_d) => `LET'S GET YOUR FINANCES IN CHECK! Type your first expense to begin!`,
      straight: (_d) => `Account ready. Log expenses via chat.`,
      supportive: (_d) => `Welcome! I'm here to help you on your financial journey. No pressure!`
    }
  },
  welcome_returning: {
    title: {
      chill: 'Welcome Back! 👋',
      hype: 'YOU\'RE BACK! LET\'S GO! 🔥',
      straight: 'Welcome Back',
      supportive: 'Great to See You! ✨'
    },
    body: {
      chill: (_d) => `Good to see you again — ready to track some expenses?`,
      hype: (_d) => `TIME TO CRUSH THOSE FINANCIAL GOALS!`,
      straight: (_d) => `Ready to log expenses.`,
      supportive: (_d) => `So glad you're back! How can I help you today?`
    }
  },
  subscription_reminder_today: {
    title: {
      chill: 'Heads Up! 💰',
      hype: 'CHARGE INCOMING TODAY! 💸',
      straight: 'Subscription Due Today',
      supportive: 'Quick Reminder 📅'
    },
    body: {
      chill: (d) => `${d.name} ($${d.amount}) charges today${(d.count as number) > 1 ? ` + ${(d.count as number) - 1} more` : ''}`,
      hype: (d) => `${d.name} is charging $${d.amount} TODAY! Ready for it?!`,
      straight: (d) => `${d.name}: $${d.amount} due today.`,
      supportive: (d) => `Just a heads up — ${d.name} ($${d.amount}) renews today`
    }
  },
  daily_motivation: {
    title: {
      chill: 'Daily Vibe 💭',
      hype: 'DAILY MOTIVATION! 💪',
      straight: 'Tip of the Day',
      supportive: 'A Little Encouragement 🌟'
    },
    body: {
      chill: (_d) => `Small wins add up — every expense you track is a step forward`,
      hype: (_d) => `EVERY DOLLAR TRACKED IS A DOLLAR MASTERED! Let's get it!`,
      straight: (_d) => `Consistent tracking leads to better financial decisions.`,
      supportive: (_d) => `You're doing amazing by tracking your spending. Keep it up!`
    }
  },
  quick_budget_update: {
    title: {
      chill: 'Budget Check 📊',
      hype: 'BUDGET UPDATE! 📈',
      straight: 'Budget Status',
      supportive: 'Budget Update 💡'
    },
    body: {
      chill: (d) => `${d.category} at ${d.percentage}% — just keeping you in the loop`,
      hype: (d) => `${d.category} is at ${d.percentage}%! Stay focused!`,
      straight: (d) => `${d.category}: ${d.percentage}% used.`,
      supportive: (d) => `Your ${d.category} budget is at ${d.percentage}%. You've got this!`
    }
  }
};

export function getNotificationTitle(
  key: NotificationKey,
  personality: PersonalityType
): string {
  const template = templates[key];
  if (!template) return 'Notification';
  return template.title[personality] || template.title.chill;
}

export function getNotificationBody(
  key: NotificationKey,
  personality: PersonalityType,
  data: Record<string, unknown> = {}
): string {
  const template = templates[key];
  if (!template) return '';
  const bodyFn = template.body[personality] || template.body.chill;
  return bodyFn(data);
}

export function getNotificationType(key: NotificationKey): NotificationType {
  const typeMap: Record<NotificationKey, NotificationType> = {
    budget_warning_80: 'budget_alert',
    budget_exceeded_100: 'warning',
    subscription_reminder: 'subscription',
    subscription_reminder_today: 'subscription',
    trial_ending: 'subscription',
    expense_logged: 'tip',
    first_expense: 'achievement',
    streak_3_days: 'achievement',
    under_budget: 'achievement',
    welcome_first_time: 'achievement',
    welcome_returning: 'tip',
    daily_motivation: 'tip',
    quick_budget_update: 'budget_alert'
  };
  return typeMap[key] || 'system';
}
