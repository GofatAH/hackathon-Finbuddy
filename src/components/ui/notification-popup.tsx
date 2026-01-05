import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CreditCard, 
  Trophy, 
  Lightbulb, 
  Sparkles, 
  AlertCircle, 
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotifyOptions, NotificationType } from '@/hooks/useNotifications';
import { useNotificationSound } from '@/hooks/useNotificationSound';

const iconMap: Record<NotificationType, typeof AlertTriangle> = {
  budget_alert: AlertTriangle,
  subscription: CreditCard,
  achievement: Trophy,
  tip: Lightbulb,
  system: Sparkles,
  warning: AlertCircle
};

const colorMap: Record<NotificationType, { bg: string; icon: string; border: string }> = {
  budget_alert: {
    bg: 'bg-warning/10',
    icon: 'text-warning',
    border: 'border-warning/30'
  },
  subscription: {
    bg: 'bg-[hsl(var(--wants))]/10',
    icon: 'text-[hsl(var(--wants))]',
    border: 'border-[hsl(var(--wants))]/30'
  },
  achievement: {
    bg: 'bg-[hsl(var(--savings))]/10',
    icon: 'text-[hsl(var(--savings))]',
    border: 'border-[hsl(var(--savings))]/30'
  },
  tip: {
    bg: 'bg-primary/10',
    icon: 'text-primary',
    border: 'border-primary/30'
  },
  system: {
    bg: 'bg-primary/10',
    icon: 'text-primary',
    border: 'border-primary/30'
  },
  warning: {
    bg: 'bg-destructive/10',
    icon: 'text-destructive',
    border: 'border-destructive/30'
  }
};

interface NotificationPopupProps {
  notification: NotifyOptions | null;
  onDismiss: () => void;
  onAction?: () => void;
}

export function NotificationPopup({ notification, onDismiss, onAction }: NotificationPopupProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const { playNotificationSound } = useNotificationSound();
  
  const duration = notification?.duration || 5000;

  // Play sound when notification appears
  useEffect(() => {
    if (notification) {
      playNotificationSound(notification.type);
    }
  }, [notification, playNotificationSound]);

  useEffect(() => {
    if (!notification || isPaused) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev - (100 / (duration / 50));
        if (next <= 0) {
          onDismiss();
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [notification, duration, isPaused, onDismiss]);

  useEffect(() => {
    if (notification) {
      setProgress(100);
    }
  }, [notification]);

  if (!notification) return null;

  const Icon = iconMap[notification.type];
  const colors = colorMap[notification.type];

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={cn(
            'fixed top-4 left-4 right-4 mx-auto max-w-sm z-[100]',
            'glass shadow-premium-lg rounded-xl overflow-hidden',
            'border',
            colors.border
          )}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
            <motion.div
              className={cn('h-full', colors.icon.replace('text-', 'bg-'))}
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.05, ease: 'linear' }}
            />
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                  colors.bg
                )}
              >
                <Icon className={cn('w-5 h-5', colors.icon)} />
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <motion.h4
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-semibold text-sm text-foreground"
                >
                  {notification.title}
                </motion.h4>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                >
                  {notification.body}
                </motion.p>

                {/* Action button */}
                {notification.actionLabel && (
                  <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => {
                      onAction?.();
                      onDismiss();
                    }}
                    className={cn(
                      'mt-2 text-xs font-medium flex items-center gap-1 transition-colors',
                      colors.icon,
                      'hover:underline'
                    )}
                  >
                    {notification.actionLabel}
                    <ChevronRight className="w-3 h-3" />
                  </motion.button>
                )}
              </div>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
