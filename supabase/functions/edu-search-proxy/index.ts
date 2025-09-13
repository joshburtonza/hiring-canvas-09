// Supabase Edge Function: edu-search-proxy
// Proxies requests from the frontend to the n8n webhook with CORS enabled

// CORS headers
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL") ?? "https://soarai.app.n8n.cloud/webhook/edu-search";

  try {
    const body = await req.json().catch(() => ({}));

    const upstream = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    let payload: unknown;
    try {
      payload = contentType.includes("application/json") ? JSON.parse(text) : { raw: text };
    } catch {
      payload = { raw: text };
    }

    return new Response(JSON.stringify(payload), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("edu-search-proxy error:", e);
    return new Response(JSON.stringify({ error: "Upstream request failed", message: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});