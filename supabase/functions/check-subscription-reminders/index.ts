import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Get subscriptions charging in the next 3 days
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    console.log('Checking subscriptions between', today.toISOString().split('T')[0], 'and', threeDaysFromNow.toISOString().split('T')[0]);

    const { data: subscriptions, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*, profiles:user_id(name)')
      .gte('next_charge_date', today.toISOString().split('T')[0])
      .lte('next_charge_date', threeDaysFromNow.toISOString().split('T')[0]);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No upcoming subscriptions found');
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} upcoming subscriptions`);

    let notificationsSent = 0;

    for (const sub of subscriptions) {
      const chargeDate = new Date(sub.next_charge_date);
      const daysUntil = Math.ceil((chargeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let message = '';
      if (daysUntil === 0) {
        message = `${sub.name} ($${sub.amount}) charges today!`;
      } else if (daysUntil === 1) {
        message = `${sub.name} ($${sub.amount}) charges tomorrow`;
      } else {
        message = `${sub.name} ($${sub.amount}) charges in ${daysUntil} days`;
      }

      // Send push notification
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userId: sub.user_id,
          title: '💳 Subscription Reminder',
          body: message,
          url: '/subscriptions',
        }),
      });

      if (pushResponse.ok) {
        notificationsSent++;
        console.log(`Sent notification for ${sub.name} to user ${sub.user_id}`);
      } else {
        console.error(`Failed to send notification for ${sub.name}:`, await pushResponse.text());
      }
    }

    // Also check for budget warnings
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id, name, monthly_income, needs_percentage, wants_percentage, savings_percentage');

    if (!profileError && profiles) {
      for (const profile of profiles) {
        if (!profile.monthly_income) continue;

        // Get this month's expenses
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const { data: expenses } = await supabaseClient
          .from('expenses')
          .select('amount, category')
          .eq('user_id', profile.user_id)
          .gte('expense_date', startOfMonth);

        if (!expenses) continue;

        const spending = {
          needs: expenses.filter(e => e.category === 'needs').reduce((sum, e) => sum + Number(e.amount), 0),
          wants: expenses.filter(e => e.category === 'wants').reduce((sum, e) => sum + Number(e.amount), 0),
          savings: expenses.filter(e => e.category === 'savings').reduce((sum, e) => sum + Number(e.amount), 0),
        };

        const budgets = {
          needs: (profile.monthly_income * (profile.needs_percentage || 50)) / 100,
          wants: (profile.monthly_income * (profile.wants_percentage || 30)) / 100,
          savings: (profile.monthly_income * (profile.savings_percentage || 20)) / 100,
        };

        // Check if any category is over 90%
        for (const [category, spent] of Object.entries(spending)) {
          const budget = budgets[category as keyof typeof budgets];
          const percentage = budget > 0 ? (spent / budget) * 100 : 0;

          if (percentage >= 90 && percentage < 100) {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                userId: profile.user_id,
                title: '⚠️ Budget Warning',
                body: `You've used ${Math.round(percentage)}% of your ${category} budget`,
                url: '/dashboard',
              }),
            });
            notificationsSent++;
          } else if (percentage >= 100) {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                userId: profile.user_id,
                title: '🚨 Budget Exceeded',
                body: `You've exceeded your ${category} budget by $${(spent - budget).toFixed(2)}`,
                url: '/dashboard',
              }),
            });
            notificationsSent++;
          }
        }
      }
    }

    console.log(`Total notifications sent: ${notificationsSent}`);

    return new Response(
      JSON.stringify({ success: true, notificationsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking subscription reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
