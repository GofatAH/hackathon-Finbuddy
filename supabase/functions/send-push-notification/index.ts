import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  type?: 'budget_alert' | 'subscription' | 'achievement' | 'tip' | 'system' | 'warning';
  icon?: string;
  badge?: string;
  url?: string;
  userId?: string;
  actions?: Array<{ action: string; title: string }>;
}

// Web Push implementation using web-push protocol
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Import the web-push module for Deno
    const webPush = await import("https://esm.sh/web-push@3.6.7");
    
    webPush.setVapidDetails(
      'mailto:noreply@finbuddy.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    await webPush.sendNotification(pushSubscription, payload);
    console.log('Push notification sent successfully');
    return true;
  } catch (error: unknown) {
    console.error('Push error:', error);
    // Check if subscription is expired/invalid
    const err = error as { statusCode?: number };
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('Subscription is expired or invalid');
      return false;
    }
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { title, body, type, icon, badge, url, userId, actions } = await req.json() as PushPayload;

    console.log('Sending push notification:', { title, body, type, userId });

    // Get push subscriptions
    let query = supabaseClient.from('push_subscriptions').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload = JSON.stringify({
      title,
      body,
      type: type || 'system',
      icon: icon || '/pwa-192x192.png',
      badge: badge || '/pwa-192x192.png',
      data: { url: url || '/' },
      actions: actions,
      tag: `finbuddy-${type || 'system'}`
    });

    let sentCount = 0;
    const failedSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );
      
      if (success) {
        sentCount++;
      } else {
        failedSubscriptions.push(sub.id);
      }
    }

    // Clean up failed subscriptions
    if (failedSubscriptions.length > 0) {
      console.log('Cleaning up failed subscriptions:', failedSubscriptions);
      await supabaseClient
        .from('push_subscriptions')
        .delete()
        .in('id', failedSubscriptions);
    }

    console.log(`Successfully sent ${sentCount} notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedSubscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
