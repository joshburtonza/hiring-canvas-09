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
      // 1) Try POST first (preferred)
      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // If not found, try next URL in list
      if (res.status === 404) {
        upstream = res;
        continue;
      }

      // If POST fails for other reasons (405/415/500 etc), try GET with query params
      if (res.status >= 400) {
        const qs = new URLSearchParams();
        Object.entries(body as Record<string, unknown>).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
        });
        const getUrl = `${url}?${qs.toString()}`;
        const resGet = await fetch(getUrl, { method: "GET" });
        chosenUrl = getUrl;
        upstream = resGet.ok ? resGet : res;
        break;
      }

      // Happy path (2xx/3xx)
      upstream = res;
      chosenUrl = url;
      break;
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

    // Special handling for n8n webhook registration errors
    if (upstream.status === 404 && typeof payload === 'object' && payload !== null) {
      const errorObj = payload as any;
      if (errorObj.code === 404 && errorObj.message?.includes('webhook') && errorObj.message?.includes('not registered')) {
        return new Response(JSON.stringify({
          error: "n8n Webhook Not Active",
          message: "The n8n workflow needs to be saved and activated. Please go to your n8n workflow, click 'Save' and ensure the webhook is active.",
          hint: "In test mode, click 'Save' in n8n, then try the search again immediately.",
          originalError: errorObj
        }), {
          status: 424, // Failed Dependency
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Special handling for n8n 500 'Workflow could not be started' errors
    if (upstream.status === 500 && typeof payload === 'object' && payload !== null) {
      const errorObj = payload as any;
      const msg: string = String(errorObj.message || "");
      if (msg.includes("Workflow could not be started")) {
        return new Response(JSON.stringify({
          error: "n8n Workflow Failed to Start",
          message: "Your n8n workflow failed to start. Ensure the workflow is active and the Webhook node is the trigger. If using test mode, click 'Execute workflow' and try again immediately.",
          troubleshooting: [
            "Open the workflow in n8n and click Save/Activate",
            "Confirm the Webhook node path is 'edu-search' and method matches (POST)",
            "If credentials or API calls are used inside, verify they are valid",
          ],
          originalError: errorObj
        }), {
          status: 424,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
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