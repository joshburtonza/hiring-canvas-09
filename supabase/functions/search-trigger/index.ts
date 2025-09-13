import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type SearchParams = {
  keywords: string;
  location?: string;
  radius?: number;
  contractType?: string;
  dateRange?: string | number;
  salaryMin?: number;
  salaryMax?: number;
  category?: string;
  timestamp: string;
};

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function classify(status: number, text: string) {
  const lower = text.toLowerCase();
  if (status === 404 && (lower.includes("not registered") || lower.includes("no webhook"))) {
    return {
      httpStatus: 424,
      code: "N8N_WEBHOOK_NOT_ACTIVE",
      message:
        "n8n production webhook is not active. Open the workflow, click Save, and toggle Active. Verify path=edu-search.",
    };
  }
  if (status === 500 && lower.includes("workflow could not be started")) {
    return {
      httpStatus: 424,
      code: "N8N_WORKFLOW_START_FAILED",
      message:
        "n8n: Workflow could not be started. Set Respond=Immediately or add a Respond to Webhook node and wire it; then Save/Activate.",
    };
  }
  if (status === 405) {
    return {
      httpStatus: 405,
      code: "N8N_METHOD_MISMATCH",
      message: "n8n refused POST (method mismatch).",
    };
  }
  if (status === 415) {
    return {
      httpStatus: 415,
      code: "N8N_UNSUPPORTED_MEDIA",
      message: "n8n refused JSON content type.",
    };
  }
  return {
    httpStatus: 502,
    code: "N8N_UPSTREAM_ERROR",
    message: `n8n upstream error (${status}).`,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<SearchParams>;
    const keywords = (body.keywords ?? "").toString().trim();
    if (!keywords) {
      return new Response(JSON.stringify({ error: "Keywords are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // 1) Try POST (expected path)
    let upstream = await postJson(N8N_WEBHOOK_PROD, payload);
    if (upstream.ok) {
      const ct = upstream.headers.get("content-type") ?? "";
      const data = ct.includes("application/json") ? await upstream.json() : { raw: await upstream.text() };
      return new Response(JSON.stringify({ ok: true, method: "POST", requestId: payload.metadata.requestId, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await upstream.text().catch(() => "");
    const reason = classify(upstream.status ?? 500, text);

    // 2) Only try GET if method/content-type mismatch
    if (reason.httpStatus === 405 || reason.httpStatus === 415) {
      const qs = qsFrom({
        ...payload.parameters,
        source: payload.metadata.source,
        requestId: payload.metadata.requestId,
        timestamp: payload.metadata.timestamp,
      });
      const resGet = await fetch(`${N8N_WEBHOOK_PROD}?${qs}`, { method: "GET" });
      if (resGet.ok) {
        const ct2 = resGet.headers.get("content-type") ?? "";
        const data2 = ct2.includes("application/json") ? await resGet.json() : { raw: await resGet.text() };
        return new Response(JSON.stringify({ ok: true, method: "GET", requestId: payload.metadata.requestId, data: data2 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t2 = await resGet.text().catch(() => "");
      const r2 = classify(resGet.status ?? 500, t2);
      return new Response(
        JSON.stringify({
          ok: false,
          error: r2.code,
          message: r2.message,
          upstream: { post: { status: upstream.status, body: text }, get: { status: resGet.status, body: t2 } },
        }),
        { status: r2.httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Don't try GET for 404/500—return actionable error
    return new Response(
      JSON.stringify({
        ok: false,
        error: reason.code,
        message: reason.message,
        upstream: { post: { status: upstream.status, body: text } },
      }),
      { status: reason.httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("search-trigger error:", err);
    return new Response(JSON.stringify({ ok: false, error: "EDGE_ERROR", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});