import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

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
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('Processing receipt image:', imageUrl);

    // Use Lovable AI to analyze the receipt
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://lovable.dev/ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a receipt OCR assistant. Analyze the receipt image and extract:
1. The total amount (the final amount paid)
2. The merchant/store name
3. A brief description of what was purchased
4. The category (one of: needs, wants, savings)

Respond ONLY with valid JSON in this exact format:
{
  "amount": 12.99,
  "merchant": "Store Name",
  "description": "Brief description",
  "category": "needs",
  "confidence": "high"
}

If you cannot read the receipt clearly, set confidence to "low".
For category:
- "needs" = groceries, utilities, gas, essential items
- "wants" = restaurants, entertainment, shopping, subscriptions
- "savings" = investments, savings deposits`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: 'Please analyze this receipt and extract the expense details.'
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Could not parse receipt data');
    }

    console.log('Extracted receipt data:', extractedData);

    return new Response(JSON.stringify({
      success: true,
      data: {
        amount: extractedData.amount || 0,
        merchant: extractedData.merchant || 'Unknown',
        description: extractedData.description || '',
        category: extractedData.category || 'wants',
        confidence: extractedData.confidence || 'low',
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in scan-receipt function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
