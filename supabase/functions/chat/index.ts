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
    const { message, personality, userName, budgetInfo } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

Your job:
1. Parse expense entries OR subscription entries from natural language
2. DIFFERENTIATE between one-time expenses and recurring subscriptions:
   - SUBSCRIPTIONS: Netflix, Spotify, gym membership, phone bill, insurance, rent, streaming services, SaaS, monthly/yearly fees
   - EXPENSES: coffee, lunch, groceries, gas, shopping, one-time purchases

3. Auto-categorize:
   - Needs: groceries, rent, utilities, gas, healthcare, insurance, phone bill
   - Wants: dining, coffee, entertainment, shopping, streaming, gym, subscriptions
   - Savings: savings deposit, investment

4. Respond briefly with confirmation and updated category percentage
5. Adjust tone based on spending level:
   - 0-75%: positive
   - 76-90%: gentle awareness  
   - 91%+: soft warning (never shame)

If the user wants to switch personality, acknowledge in the NEW voice.
If not about expenses/subscriptions, chat naturally but stay on topic.

IMPORTANT OUTPUT FORMAT:
- For ONE-TIME EXPENSES, include at the end:
[EXPENSE_DATA:{"amount":NUMBER,"category":"needs|wants|savings","merchant":"MERCHANT_NAME"}]

- For RECURRING SUBSCRIPTIONS, include at the end:
[SUBSCRIPTION_DATA:{"name":"SERVICE_NAME","amount":NUMBER,"frequency":"monthly|weekly|yearly","category":"needs|wants"}]

Look for keywords like "subscription", "monthly", "every month", "yearly", "annually", "recurring", "membership" to identify subscriptions.

Keep responses SHORT - 1-2 sentences max.`;

    console.log('Sending request to Lovable AI Gateway');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
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
