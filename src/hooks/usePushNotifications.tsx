import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { detectBrowserSupport, getPushSupportMessage, type BrowserSupport } from '@/lib/browser-support';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export interface PushDebugInfo {
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  swRegistered: boolean;
  swState: string;
  vapidConfigured: boolean;
  browserSupport: BrowserSupport | null;
  supportMessage: string;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<PushDebugInfo | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if push notifications are supported and register service worker
  useEffect(() => {
    const checkSupport = async () => {
      const browserSupport = detectBrowserSupport();
      const supportMessage = getPushSupportMessage(browserSupport);
      
      const debug: PushDebugInfo = {
        isSecureContext: window.isSecureContext,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
        hasNotification: 'Notification' in window,
        swRegistered: false,
        swState: 'not-registered',
        vapidConfigured: !!VAPID_PUBLIC_KEY,
        browserSupport,
        supportMessage
      };

      console.log('[Push] Checking support:', debug);
      console.log('[Push] Browser support:', browserSupport);

      // Check browser support level
      if (browserSupport.pushNotifications === 'none') {
        console.warn('[Push] Push not supported:', supportMessage);
        setDebugInfo(debug);
        setIsSupported(false);
        return;
      }

      // For PWA-only support, check if we're installed
      if (browserSupport.pushNotifications === 'pwa-only' && !browserSupport.isStandalone) {
        console.warn('[Push] PWA installation required for push');
        setDebugInfo(debug);
        setIsSupported(false);
        return;
      }

      // Must be secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.warn('[Push] Not a secure context - push notifications require HTTPS');
        setDebugInfo(debug);
        setIsSupported(false);
        return;
      }

      const supported = debug.hasServiceWorker && debug.hasPushManager && debug.hasNotification;
      
      if (!supported) {
        console.warn('[Push] Browser does not support push notifications', debug);
        setDebugInfo(debug);
        setIsSupported(false);
        return;
      }

      if ('Notification' in window) {
        setPermission(Notification.permission);
      }

      try {
        // Check if there's already a service worker registered
        // Try the PWA service worker first, then fall back to our custom one
        let registration = await navigator.serviceWorker.getRegistration('/');
        
        if (!registration) {
          registration = await navigator.serviceWorker.getRegistration('/sw.js');
        }
        
        if (registration) {
          console.log('[Push] Existing service worker found:', registration.active?.state);
          debug.swRegistered = true;
          debug.swState = registration.active?.state || 'waiting';
        } else {
          // Register our custom service worker for push
          console.log('[Push] Registering service worker...');
          const newRegistration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          
          console.log('[Push] Service worker registered:', newRegistration.scope);
          debug.swRegistered = true;
          debug.swState = newRegistration.active?.state || 'installing';
        }

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('[Push] Service worker is ready');

        setDebugInfo(debug);
        setIsSupported(true);
      } catch (err) {
        console.error('[Push] Service worker registration failed:', err);
        debug.swState = 'error';
        setDebugInfo(debug);
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Check if already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] Checking existing subscription...');
        
        const subscription = await registration.pushManager.getSubscription();
        console.log('[Push] Existing subscription:', subscription ? 'found' : 'none');
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('[Push] Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] VAPID public key not configured');
      toast({
        title: 'Push not configured',
        description: 'VAPID key is not set up',
        variant: 'destructive',
      });
      return false;
    }

    if (!isSupported || !user) {
      console.error('[Push] Not supported or no user', { isSupported, user: !!user });
      toast({
        title: 'Push notifications not available',
        description: 'Your browser does not support push notifications',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      // Request permission
      console.log('[Push] Requesting permission...');
      const perm = await Notification.requestPermission();
      console.log('[Push] Permission result:', perm);
      setPermission(perm);

      if (perm !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
        return false;
      }

      // Get service worker registration
      console.log('[Push] Getting service worker ready...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready, subscribing to push...');

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('[Push] Subscription created:', subscription.endpoint);
      const subscriptionJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
      }, {
        onConflict: 'user_id,endpoint',
      });

      if (error) {
        console.error('[Push] Database error:', error);
        throw error;
      }

      console.log('[Push] Subscription saved to database');
      setIsSubscribed(true);
      toast({
        title: 'Notifications enabled! 🔔',
        description: "You'll receive alerts for upcoming charges and budget warnings",
      });

      return true;
    } catch (error) {
      console.error('[Push] Error subscribing:', error);
      toast({
        title: 'Failed to enable notifications',
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, user, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications disabled',
        description: "You won't receive push notifications anymore",
      });

      return true;
    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
      toast({
        title: 'Failed to disable notifications',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    debugInfo,
    subscribe,
    unsubscribe,
  };
}
