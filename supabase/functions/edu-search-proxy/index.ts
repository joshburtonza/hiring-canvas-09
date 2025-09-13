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

  const n8nUrlBase = Deno.env.get("N8N_WEBHOOK_URL") ?? "https://soarai.app.n8n.cloud/webhook/edu-search";

  try {
    const body = await req.json().catch(() => ({}));
    console.log("edu-search-proxy: incoming body", body);

    // Try production webhook first
    const tryUrls = [
      n8nUrlBase,
      // Fallback to test webhook if the first returns 404
      n8nUrlBase.replace("/webhook/", "/webhook-test/")
    ];

    let upstream: Response | null = null;
    let chosenUrl = tryUrls[0];

    for (const url of tryUrls) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status !== 404) {
        upstream = res;
        chosenUrl = url;
        break;
      }
      // keep last 404 for reporting
      upstream = res;
    }

    console.log("edu-search-proxy: upstream url", chosenUrl, "status", upstream?.status);

    if (!upstream) {
      return new Response(JSON.stringify({ error: "No upstream response" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();
    console.log("edu-search-proxy: upstream body", text.slice(0, 200));

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