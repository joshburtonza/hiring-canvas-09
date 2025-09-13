import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchParams {
  keywords: string;
  location?: string;
  radius?: number;
  contractType?: string;
  dateRange?: string;
  salaryMin?: number;
  salaryMax?: number;
  category?: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Search trigger function called');
    
    const searchParams: SearchParams = await req.json();
    console.log('Search parameters received:', searchParams);

    // Validate required fields
    if (!searchParams.keywords?.trim()) {
      console.error('Keywords are required');
      return new Response(
        JSON.stringify({ error: 'Keywords are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get n8n webhook URL from environment variables
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL environment variable not set');
      return new Response(
        JSON.stringify({ error: 'N8N webhook URL not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare payload for n8n
    const n8nPayload = {
      searchType: 'adzuna',
      parameters: {
        keywords: searchParams.keywords.trim(),
        location: searchParams.location || '',
        radius: searchParams.radius || 10,
        contractType: searchParams.contractType || '',
        dateRange: searchParams.dateRange || '7',
        salaryMin: searchParams.salaryMin || 20000,
        salaryMax: searchParams.salaryMax || 80000,
        category: searchParams.category || '',
      },
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: searchParams.timestamp,
        source: 'dashboard_search',
      }
    };

    console.log('Sending payload to n8n:', JSON.stringify(n8nPayload, null, 2));

    // Send request to n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n webhook error:', errorText);
      throw new Error(`n8n webhook failed: ${n8nResponse.status} ${errorText}`);
    }

    const n8nResult = await n8nResponse.json();
    console.log('n8n webhook response:', n8nResult);

    // Log search analytics
    console.log('Search analytics:', {
      keywords: searchParams.keywords,
      location: searchParams.location,
      timestamp: searchParams.timestamp,
      success: true,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Search request sent to n8n workflow successfully',
        requestId: n8nPayload.metadata.requestId,
        n8nResponse: n8nResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search trigger error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process search request',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});