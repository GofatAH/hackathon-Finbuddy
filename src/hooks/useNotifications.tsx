import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type NotificationType = 'budget_alert' | 'subscription' | 'achievement' | 'tip' | 'system' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface NotifyOptions {
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  duration?: number;
  persist?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showPopup: (options: NotifyOptions) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  isLoading: boolean;
  currentPopup: NotifyOptions | null;
  dismissPopup: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPopup, setCurrentPopup] = useState<NotifyOptions | null>(null);
  const [popupQueue, setPopupQueue] = useState<NotifyOptions[]>([]);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const mappedData: Notification[] = (data || []).map(item => ({
        id: item.id,
        type: item.type as NotificationType,
        title: item.title,
        body: item.body,
        action_url: item.action_url ?? undefined,
        action_label: item.action_label ?? undefined,
        is_read: item.is_read ?? false,
        metadata: (item.metadata as Record<string, unknown>) ?? undefined,
        created_at: item.created_at
      }));
      
      setNotifications(mappedData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  // Handle popup queue
  useEffect(() => {
    if (!currentPopup && popupQueue.length > 0) {
      const [next, ...rest] = popupQueue;
      setCurrentPopup(next);
      setPopupQueue(rest);
    }
  }, [currentPopup, popupQueue]);

  const showPopup = useCallback(async (options: NotifyOptions) => {
    // Add to queue
    setPopupQueue(prev => [...prev, options]);

    // Save to database if user is logged in and persist is true
    if (user && options.persist !== false) {
      try {
        await supabase.from('notifications').insert([{
          user_id: user.id,
          type: options.type,
          title: options.title,
          body: options.body,
          action_url: options.actionUrl ?? null,
          action_label: options.actionLabel ?? null,
          metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
          is_read: false
        }]);
      } catch (error) {
        console.error('Error saving notification:', error);
      }
    }
  }, [user]);

  const dismissPopup = useCallback(() => {
    setCurrentPopup(null);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id);

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showPopup,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification,
        isLoading,
        currentPopup,
        dismissPopup
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
