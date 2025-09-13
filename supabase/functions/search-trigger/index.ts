// supabase/functions/search-trigger/index.ts
// Fix B: Production-only, robust fallbacks (POST then GET), clear errors, full CORS.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type SearchParams = {
  keywords: string;
  location?: string;
  radius?: number;
  contractType?: string;   // "permanent" | "contract" | "temporary" | "part_time" | "any"
  dateRange?: string | number; // 1 | 7 | 30 | 90
  salaryMin?: number;
  salaryMax?: number;
  category?: string;       // "teaching", etc.
  timestamp: string;
};

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ✅ Production webhook only (no test URL)
const N8N_WEBHOOK_PROD = "https://soarai.app.n8n.cloud/webhook/edu-search";

function qsFrom(obj: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  return p.toString();
}

async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function classifyUpstream(status: number, text: string) {
  const lower = text.toLowerCase();
  // n8n common errors
  if (status === 404 && (lower.includes("not registered") || lower.includes("no webhook"))) {
    return {
      status: 424,
      code: "N8N_WEBHOOK_NOT_ACTIVE",
      message:
        "The n8n webhook is not active. Open your n8n workflow, click Save/Activate, and ensure the workflow is running.",
      hint:
        "In the Webhook node, either set Respond=Immediately OR add a 'Respond to Webhook' node and wire it at the end.",
    };
  }
  if (status === 405) {
    return {
      status: 424,
      code: "N8N_METHOD_MISMATCH",
      message:
        "The n8n webhook refused the HTTP method. Confirm the Webhook node method is POST, or allow GET if you plan to call it with query params.",
      hint: "In your Webhook node settings, set HTTP Method to POST.",
    };
  }
  if (status === 415) {
    return {
      status: 424,
      code: "N8N_UNSUPPORTED_MEDIA",
      message:
        "The n8n webhook did not accept the content type. Ensure the Webhook node expects JSON or switch to GET with query params.",
    };
  }
  if (status === 500 && lower.includes("workflow could not be started")) {
    return {
      status: 424,
      code: "N8N_WORKFLOW_START_FAILED",
      message:
        "n8n reports: 'Workflow could not be started'. Make sure the workflow is active and the Webhook trigger is the entry node.",
      hint:
        "Open the workflow, click Save/Activate. If Respond is set to 'Using Respond to Webhook node', add that node and wire it.",
    };
  }
  return {
    status: 502,
    code: "N8N_UPSTREAM_ERROR",
    message: `n8n upstream error (${status}).`,
  };
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse payload
    const body = (await req.json().catch(() => ({}))) as Partial<SearchParams>;
    const keywords = (body.keywords ?? "").toString().trim();
    if (!keywords) {
      return new Response(
        JSON.stringify({ error: "Keywords are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize & build payload aligned with your n8n flow
    const payload = {
      searchType: "adzuna",
      parameters: {
        keywords,
        location: body.location ?? "",
        radius: typeof body.radius === "number" ? body.radius : 10,
        contractType: body.contractType ?? "",
        dateRange: body.dateRange ?? "7",
        salaryMin: typeof body.salaryMin === "number" ? body.salaryMin : 20000,
        salaryMax: typeof body.salaryMax === "number" ? body.salaryMax : 80000,
        category: body.category ?? "",
      },
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: body.timestamp ?? new Date().toISOString(),
        source: "dashboard_search",
      },
    };

    // 1) Try POST (preferred)
    let upstream = await postJson(N8N_WEBHOOK_PROD, payload);

    // 2) If POST fails, try GET with query params (same production webhook)
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      const errInfo = classifyUpstream(upstream.status ?? 500, text);

      // GET fallback can help in some n8n configs (e.g., method mismatch, JSON expectations)
      const getQS = qsFrom({
        ...payload.parameters,
        source: payload.metadata.source,
        requestId: payload.metadata.requestId,
        timestamp: payload.metadata.timestamp,
      });
      const tryGet = await fetch(`${N8N_WEBHOOK_PROD}?${getQS}`, { method: "GET" });

      if (!tryGet.ok) {
        const text2 = await tryGet.text().catch(() => "");
        const finalInfo = classifyUpstream(tryGet.status ?? 500, text2);

        return new Response(
          JSON.stringify({
            ok: false,
            error: finalInfo.code,
            message: finalInfo.message,
            hint: finalInfo.hint,
            upstream: { post: { status: upstream.status, body: text }, get: { status: tryGet.status, body: text2 } },
          }),
          { status: finalInfo.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // GET succeeded
      const ct = tryGet.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await tryGet.json() : { raw: await tryGet.text() };
      return new Response(JSON.stringify({ ok: true, method: "GET", requestId: payload.metadata.requestId, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST succeeded
    const ct = upstream.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await upstream.json() : { raw: await upstream.text() };

    return new Response(
      JSON.stringify({ ok: true, method: "POST", requestId: payload.metadata.requestId, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("search-trigger error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "EDGE_ERROR", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});