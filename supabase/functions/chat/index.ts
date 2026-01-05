import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, personality, userName, budgetInfo, subscriptionInfo, conversationHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build subscription context
    let subscriptionContext = '';
    if (subscriptionInfo && subscriptionInfo.subscriptions && subscriptionInfo.subscriptions.length > 0) {
      subscriptionContext = `

CURRENT SUBSCRIPTIONS (${subscriptionInfo.subscriptions.length} total, ~$${subscriptionInfo.totalMonthly.toFixed(2)}/month):
${subscriptionInfo.subscriptions.map((s: { name: string; amount: number; frequency: string; category: string; next_charge_date: string; is_trial: boolean; trial_end_date: string | null }) => 
  `- ${s.name}: $${s.amount}/${s.frequency} (${s.category}) - Next charge: ${s.next_charge_date}${s.is_trial ? ` [TRIAL ends ${s.trial_end_date}]` : ''}`
).join('\n')}
${subscriptionInfo.activeTrials && subscriptionInfo.activeTrials.length > 0 ? `

⚠️ ACTIVE TRIALS (remind user to cancel if needed):
${subscriptionInfo.activeTrials.map((t: { name: string; amount: number; trial_end_date: string }) => `- ${t.name}: Trial ends ${t.trial_end_date}, then $${t.amount}/month`).join('\n')}` : ''}`;
    } else {
      subscriptionContext = `

CURRENT SUBSCRIPTIONS: None tracked yet.`;
    }

    // Build system prompt based on personality
    const personalityPrompts: Record<string, string> = {
      chill: `You are FinBuddy, a chill and supportive personal finance assistant. Use casual language like "yo", "bro", "we good". Be laid-back but helpful. Example: "Yo nice coffee run $6 — Wants at 24%, we cruising smooth ☕"`,
      hype: `You are FinBuddy, an energetic hype beast finance assistant. Use caps, emojis, and celebratory language! Be HYPED about every financial decision! Example: "YOOO that gym membership $45! GAINS SECURED! 💪🔥 Needs at 18%!"`,
      straight: `You are FinBuddy, a direct and factual finance assistant. Be concise, professional, no fluff. Just facts. Example: "$85 groceries logged. Needs: 32%. On track."`,
      supportive: `You are FinBuddy, a warm and supportive finance assistant. Be empathetic, encouraging, use 💚. Never judge. Example: "Got it! $12 for lunch. You're doing great - Needs at 18%. Keep it up! 💚"`
    };

    const systemPrompt = `${personalityPrompts[personality] || personalityPrompts.chill}

The user's name is ${userName}.

Current budget status:
- Needs: $${budgetInfo.needs.spent.toFixed(2)} of $${budgetInfo.needs.budget.toFixed(2)} (${budgetInfo.needs.percentage}%)
- Wants: $${budgetInfo.wants.spent.toFixed(2)} of $${budgetInfo.wants.budget.toFixed(2)} (${budgetInfo.wants.percentage}%)
- Savings: $${budgetInfo.savings.spent.toFixed(2)} of $${budgetInfo.savings.budget.toFixed(2)} (${budgetInfo.savings.percentage}%)
${subscriptionContext}

Your job:
1. ANSWER QUESTIONS about expenses, budgets, AND subscriptions
2. When asked about subscriptions (e.g. "how are my subscriptions?", "what subscriptions do I have?", "when does X renew?"):
   - Summarize their current subscriptions with amounts and next charge dates
   - Highlight any trials ending soon
   - Provide insights on total subscription spending
   - Suggest canceling unused subscriptions if appropriate
   - Give advice on subscription management
3. Parse expense entries OR subscription entries from natural language
4. DIFFERENTIATE between one-time expenses, subscriptions, and FREE TRIALS:
   - FREE TRIALS: Look for keywords like "free trial", "trial", "7 day trial", "14 day trial", "30 day trial", "trying out", "trial period", "free for X days/weeks/months"
   - SUBSCRIPTIONS: Netflix, Spotify, gym membership, phone bill, insurance, streaming services, SaaS, monthly/yearly fees, ChatGPT, Lovable, any recurring service
   - EXPENSES: coffee, lunch, groceries, gas, shopping, one-time purchases

5. Auto-categorize EXPENSES into:
   - Needs: groceries, rent, utilities, gas, healthcare, insurance, phone bill
   - Wants: dining, coffee, entertainment, shopping
   - Savings: savings deposit, investment

6. Auto-categorize SUBSCRIPTIONS into:
   - tools: Lovable, ChatGPT, OpenAI, GitHub, Copilot, Notion, Figma, Canva, Vercel, AWS, developer tools, AI services
   - entertainment: Netflix, Hulu, Disney+, HBO, Amazon Prime Video, YouTube Premium, Crunchyroll, streaming video
   - music: Spotify, Apple Music, Tidal, Deezer, Audible, audio/music streaming
   - gaming: Xbox, PlayStation, Nintendo, Steam, EA Play, Game Pass, gaming services
   - productivity: Microsoft 365, Google Workspace, Slack, Zoom, Dropbox, 1Password, office/work tools
   - fitness: Gym, Peloton, Strava, MyFitnessPal, Headspace, Calm, health/fitness apps
   - lifestyle: Amazon Prime, Instacart, DoorDash, Uber, delivery/lifestyle services
   - utilities: Phone bill, Internet, VPN, iCloud, Google One, cloud storage, essential services
   - news: NYTimes, WSJ, Medium, Substack, news/media subscriptions
   - other: anything that doesn't fit above

7. Respond briefly with confirmation
8. Adjust tone based on spending level:
   - 0-75%: positive
   - 76-90%: gentle awareness  
   - 91%+: soft warning (never shame)

If the user wants to switch personality, acknowledge in the NEW voice.
If not about expenses/subscriptions, chat naturally but stay on topic.

IMPORTANT OUTPUT FORMAT:
- For ONE-TIME EXPENSES, include at the end:
[EXPENSE_DATA:{"amount":NUMBER,"category":"needs|wants|savings","merchant":"MERCHANT_NAME"}]

- For RECURRING SUBSCRIPTIONS (not trials), include at the end:
[SUBSCRIPTION_DATA:{"name":"SERVICE_NAME","amount":NUMBER,"frequency":"monthly|weekly|yearly","category":"tools|entertainment|music|gaming|productivity|fitness|lifestyle|utilities|news|other","is_trial":false}]

- For FREE TRIALS, include at the end:
[SUBSCRIPTION_DATA:{"name":"SERVICE_NAME","amount":NUMBER,"frequency":"monthly|weekly|yearly","category":"tools|entertainment|music|gaming|productivity|fitness|lifestyle|utilities|news|other","is_trial":true,"trial_days":NUMBER}]
  - trial_days should be the number of days in the trial (7, 14, 30, etc.)
  - amount should be what it will cost AFTER the trial ends
  - ALWAYS warn the user about when the trial ends and set a reminder

Look for keywords like "subscription", "monthly", "every month", "yearly", "annually", "recurring", "membership" to identify subscriptions.
Look for keywords like "free trial", "trial", "trying", "trial period", "free for" to identify trials.

For trials, always:
1. Acknowledge it's a trial
2. Mention when it will end
3. Remind them to cancel if they don't want to continue

Keep responses SHORT - 1-2 sentences max.`;

    console.log('Sending request to Lovable AI Gateway');

    // Build messages array with conversation history
    const chatMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 10 messages for context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          chatMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    chatMessages.push({ role: 'user', content: message });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response back
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });

  } catch (error) {
    console.error('Chat function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
