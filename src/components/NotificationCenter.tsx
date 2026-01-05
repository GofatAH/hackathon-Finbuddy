import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  AlertTriangle, 
  CreditCard, 
  Trophy, 
  Lightbulb, 
  Sparkles, 
  AlertCircle,
  Check,
  Trash2,
  X,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotifications, NotificationType } from '@/hooks/useNotifications';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

const iconMap: Record<NotificationType, typeof AlertTriangle> = {
  budget_alert: AlertTriangle,
  subscription: CreditCard,
  achievement: Trophy,
  tip: Lightbulb,
  system: Sparkles,
  warning: AlertCircle
};

const colorMap: Record<NotificationType, { bg: string; icon: string }> = {
  budget_alert: { bg: 'bg-warning/10', icon: 'text-warning' },
  subscription: { bg: 'bg-[hsl(var(--wants))]/10', icon: 'text-[hsl(var(--wants))]' },
  achievement: { bg: 'bg-[hsl(var(--savings))]/10', icon: 'text-[hsl(var(--savings))]' },
  tip: { bg: 'bg-primary/10', icon: 'text-primary' },
  system: { bg: 'bg-primary/10', icon: 'text-primary' },
  warning: { bg: 'bg-destructive/10', icon: 'text-destructive' }
};

export function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll,
    deleteNotification,
    isLoading 
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Notifications</SheetTitle>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead()}
                    className="text-xs h-7 px-2"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAll()}
                    className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 px-4 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-muted-foreground mb-1">No notifications</h3>
                <p className="text-xs text-muted-foreground/70">
                  You're all caught up! We'll notify you about budget alerts, subscription reminders, and tips.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {notifications.map((notification, index) => {
                  const Icon = iconMap[notification.type as NotificationType] || Sparkles;
                  const colors = colorMap[notification.type as NotificationType] || colorMap.system;
                  
                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        'group relative p-3 rounded-xl mb-2 cursor-pointer transition-all',
                        'hover:bg-muted/30',
                        notification.is_read ? 'bg-transparent' : 'bg-muted/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                          colors.bg
                        )}>
                          <Icon className={cn('w-4 h-4', colors.icon)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                              'text-sm line-clamp-1',
                              notification.is_read ? 'font-medium' : 'font-semibold'
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.body}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {notification.action_label && (
                              <span className={cn(
                                'text-[10px] font-medium flex items-center gap-0.5',
                                colors.icon
                              )}>
                                {notification.action_label}
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
