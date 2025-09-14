import React from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

/** Adzuna supported ISO-3166 alpha-2 country codes (path segment) */
const ADZUNA_SUPPORTED = new Set([
  "at","au","be","br","ca","ch","de","es","fr","gb","in","it","mx","nl","nz","pl","sg","us","za",
]);

/** Human-friendly list for the help panel */
const SUPPORTED_COUNTRIES_INFO: { iso: string; name: string }[] = [
  { iso: "AT", name: "Austria" },
  { iso: "AU", name: "Australia" },
  { iso: "BE", name: "Belgium" },
  { iso: "BR", name: "Brazil" },
  { iso: "CA", name: "Canada" },
  { iso: "CH", name: "Switzerland" },
  { iso: "DE", name: "Germany" },
  { iso: "ES", name: "Spain" },
  { iso: "FR", name: "France" },
  { iso: "GB", name: "United Kingdom" },
  { iso: "IN", name: "India" },
  { iso: "IT", name: "Italy" },
  { iso: "MX", name: "Mexico" },
  { iso: "NL", name: "Netherlands" },
  { iso: "NZ", name: "New Zealand" },
  { iso: "PL", name: "Poland" },
  { iso: "SG", name: "Singapore" },
  { iso: "US", name: "United States" },
  { iso: "ZA", name: "South Africa" },
];

/** Country alias detection — only flags when a *country* is clearly mentioned */
const COUNTRY_ALIASES: Array<{ iso: string; matchers: RegExp[] }> = [
  { iso: "au", matchers: [/australia\b/i, /\bau\b/i, /\bsydney\b/i, /\bmelbourne\b/i, /\bqueensland\b/i, /\bnsw\b/i, /\bvictoria\b/i] },
  { iso: "gb", matchers: [/united kingdom\b/i, /\buk\b/i, /\bengland\b/i, /\bscotland\b/i, /\bwales\b/i, /\blondon\b/i] },
  { iso: "us", matchers: [/united states\b/i, /\busa\b/i, /\bus\b/i, /\bnew york\b/i, /\bcalifornia\b/i, /\btexas\b/i] },
  { iso: "ca", matchers: [/canada\b/i, /\bca\b/i, /\btoronto\b/i, /\bvancouver\b/i, /\bmontreal\b/i] },
  { iso: "nz", matchers: [/new zealand\b/i, /\bnz\b/i, /\bauckland\b/i, /\bwellington\b/i] },
  { iso: "za", matchers: [/south africa\b/i, /\bza\b/i, /\bjohannesburg\b/i, /\bcape town\b/i, /\bdurban\b/i] },
  { iso: "sg", matchers: [/singapore\b/i, /\bsg\b/i] },
  { iso: "de", matchers: [/germany\b/i, /\bde\b/i, /\bberlin\b/i, /\bmunich\b/i] },
  { iso: "fr", matchers: [/france\b/i, /\bfr\b/i, /\bparis\b/i] },
  { iso: "es", matchers: [/spain\b/i, /\bes\b/i, /\bmadrid\b/i, /\bbarcelona\b/i] },
  { iso: "it", matchers: [/italy\b/i, /\bit\b/i, /\brome\b/i, /\bmilan\b/i] },
  { iso: "nl", matchers: [/netherlands\b/i, /\bnl\b/i, /\bamsterdam\b/i] },
  { iso: "be", matchers: [/belgium\b/i, /\bbe\b/i, /\bbrussels\b/i] },
  { iso: "at", matchers: [/austria\b/i, /\bat\b/i, /\bvienna\b/i] },
  { iso: "ch", matchers: [/switzerland\b/i, /\bch\b/i, /\bzurich\b/i, /\bgeneva\b/i] },
  { iso: "mx", matchers: [/mexico\b/i, /\bmx\b/i, /\bmexico city\b/i] },
  { iso: "pl", matchers: [/poland\b/i, /\bpl\b/i, /\bwarsaw\b/i] },
  { iso: "in", matchers: [/india\b/i, /\bin\b/i, /\bmumbai\b/i, /\bdelhi\b/i, /\bbengaluru\b/i] },
  // Unsupported markets you want flagged as invalid (we detect them so we can warn inline)
  { iso: "qa", matchers: [/qatar\b/i, /\bdoha\b/i] },
  { iso: "ae", matchers: [/uae\b/i, /united arab emirates\b/i, /\bdubai\b/i, /\babu dhabi\b/i] },
  { iso: "ie", matchers: [/ireland\b/i, /\bie\b/i, /\bdublin\b/i] },
  { iso: "sa", matchers: [/saudi arabia\b/i, /\briyadh\b/i, /\bjeddah\b/i] },
];

/** If the input *clearly* mentions a country, return { iso, isCountryMention: true } */
function getCountryIsoIfMentioned(input?: string) {
  const t = (input || "").trim();
  if (!t) return { iso: "", isCountryMention: false };
  // Exact 2-letter code (avoid false positives like "us" in "Sydney")
  if (/^[A-Za-z]{2}$/.test(t)) return { iso: t.toLowerCase(), isCountryMention: true };
  // Scan aliases/major cities
  for (const row of COUNTRY_ALIASES) {
    if (row.matchers.some((rx) => rx.test(t))) {
      return { iso: row.iso, isCountryMention: true };
    }
  }
  return { iso: "", isCountryMention: false };
}

type HireType = "any" | "local" | "international";

export type SearchPayload = {
  keywords: string;
  location?: string;
  radius?: number;
  contractType?: "permanent" | "contract" | "temporary" | "part_time" | "any";
  dateRange?: 1 | 7 | 30 | 90;
  salaryMin?: number;
  salaryMax?: number;
  category?: string;
  hireType?: HireType;
  internationalOnly?: boolean;
  timestamp: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** default = Supabase Edge Function that forwards to n8n */
  submitUrl?: string; // e.g. https://prevtzobwtsnoihwytjg.supabase.co/functions/v1/search-trigger
  onSubmit?: (payload: SearchPayload) => Promise<void> | void;
  defaults?: Partial<SearchPayload>;
  /** Optional: pass your toast hook here */
  onNotify?: (type: "success" | "error", title: string, desc?: string) => void;
};

const DEFAULTS: SearchPayload = {
  keywords: "",
  location: "",
  radius: 0,
  contractType: "any",
  dateRange: 7,
  salaryMin: undefined,
  salaryMax: undefined,
  category: "teaching",
  hireType: "any",
  internationalOnly: false,
  timestamp: new Date().toISOString(),
};

async function submitViaSupabase(payload: SearchPayload, submitUrl?: string) {
  // Prefer your existing edge function (handles CORS + logging)
  if (!submitUrl) {
    const { data, error } = await supabase.functions.invoke("search-trigger", {
      body: { ...payload, source: "dashboard_search" },
    });
    if (error) throw new Error((error as any)?.message || "Edge function error");
    return data;
  }
  // If a URL is provided, POST JSON directly (e.g., your edu-search-proxy)
  const resp = await fetch(submitUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, source: "dashboard_search" }),
  });
  let body: any = null;
  try { body = await resp.json(); } catch {}
  if (!resp.ok) throw new Error(body?.error || body?.message || `HTTP ${resp.status}`);
  return body;
}

export default function SearchModal({
  open,
  onClose,
  submitUrl,
  onSubmit,
  defaults,
  onNotify,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [locError, setLocError] = React.useState<string>("");

  const firstFieldRef = React.useRef<HTMLInputElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  const [form, setForm] = React.useState<SearchPayload>({ ...DEFAULTS, ...defaults });

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...DEFAULTS, ...defaults, timestamp: new Date().toISOString() }));
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, defaults]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showHelp) setShowHelp(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, showHelp, onClose]);

  function update<K extends keyof SearchPayload>(key: K, val: SearchPayload[K]) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === "hireType") next.internationalOnly = (val as HireType) === "international";
      return next;
    });
  }

  function validateLocation(v: string) {
    const { iso, isCountryMention } = getCountryIsoIfMentioned(v);
    if (!isCountryMention) return setLocError(""); // city/region OK
    if (iso && ADZUNA_SUPPORTED.has(iso)) setLocError("");
    else setLocError("Invalid country for Adzuna. See 'Read more' for supported markets.");
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting) return;

    const keywords = (form.keywords || "").trim();
    if (!keywords) {
      onNotify?.("error", "Keywords required", "Please enter search keywords.");
      firstFieldRef.current?.focus();
      return;
    }
    if (locError) {
      onNotify?.("error", "Invalid country", "Please use a supported Adzuna market or remove the country name.");
      return;
    }

    const payload: SearchPayload = {
      ...form,
      keywords,
      internationalOnly: form.hireType === "international",
      timestamp: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (onSubmit) await onSubmit(payload);
      else await submitViaSupabase(payload, submitUrl);
      onNotify?.("success", "Search submitted", "Your job search has been sent to the workflow.");
      onClose();
    } catch (err: any) {
      onNotify?.("error", "Search failed", String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-black/90 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Search Teaching Jobs</h2>
            <p className="mt-1 text-sm text-slate-300">
              Use broad titles; refine with filters. Countries must be supported by Adzuna.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 hover:bg-white/10"
            >
              Read more
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Keywords */}
          <label className="mb-1 block text-sm text-slate-200">Keywords *</label>
          <input
            ref={firstFieldRef}
            value={form.keywords}
            onChange={(e) => update("keywords", e.target.value)}
            placeholder='e.g. "primary school teacher", "secondary teacher", "maths teacher"'
            className="mb-4 h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 text-slate-100 placeholder:text-slate-400 outline-none focus:border-cyan-300/40"
          />

          {/* Location */}
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm text-slate-200">Location (city/region or country)</label>
            <span className="text-xs text-slate-400">
              Supported markets? <button type="button" onClick={() => setShowHelp(true)} className="underline">Read more</button>
            </span>
          </div>
          <input
            value={form.location}
            onChange={(e) => { update("location", e.target.value); validateLocation(e.target.value); }}
            placeholder='e.g. "Sydney", "NSW", "Australia", "London"'
            className={[
              "h-11 w-full rounded-full border px-4 text-slate-100 outline-none bg-black/25 placeholder:text-slate-400 focus:border-cyan-300/40",
              locError ? "border-red-400/60 focus:border-red-400" : "border-white/10",
            ].join(" ")}
          />
          {locError && <div className="mt-2 text-xs text-red-300">{locError}</div>}

          {/* Row: Posted Within + Contract Type */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-200">Posted Within</label>
              <select
                value={form.dateRange}
                onChange={(e) => update("dateRange", Number(e.target.value) as SearchPayload["dateRange"])}
                className="h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 text-slate-100 outline-none focus:border-cyan-300/40"
              >
                <option value={1}>Last day</option>
                <option value={7}>Last week</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-200">Contract Type</label>
              <select
                value={form.contractType}
                onChange={(e) => update("contractType", e.target.value as any)}
                className="h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 text-slate-100 outline-none focus:border-cyan-300/40"
              >
                <option value="any">Any</option>
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="part_time">Part-time</option>
              </select>
            </div>
          </div>

          {/* Advanced */}
          <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 open:bg-black/25">
            <summary className="cursor-pointer text-sm text-slate-200">Advanced Filters</summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-200">Salary Min</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.salaryMin ?? ""}
                  onChange={(e) => update("salaryMin", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 30000"
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-200">Salary Max</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.salaryMax ?? ""}
                  onChange={(e) => update("salaryMax", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 80000"
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-200">Radius (miles)</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.radius ?? 0}
                  onChange={(e) => update("radius", e.target.value ? Number(e.target.value) : 0)}
                  placeholder="0 = anywhere"
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-200">Category</label>
                <input
                  value={form.category || "teaching"}
                  onChange={(e) => update("category", e.target.value)}
                  placeholder="teaching"
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
                />
              </div>
            </div>
          </details>

          {/* Hire Type */}
          <div className="mt-4">
            <label className="mb-2 block text-sm text-slate-200">Hire Type</label>
            <div className="flex gap-2">
              {(["any","local","international"] as HireType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update("hireType", t)}
                  className={[
                    "rounded-full px-4 py-2 text-sm border transition",
                    form.hireType === t
                      ? "bg-cyan-400/20 border-cyan-300/40 text-cyan-200"
                      : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                  ].join(" ")}
                >
                  {t === "any" ? "Any" : t === "local" ? "Local only" : "International-friendly"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              "International-friendly" asks the workflow to prioritise ads mentioning visa sponsorship / relocation / overseas applicants.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-cyan-500/90 px-5 py-2 text-white hover:bg-cyan-400 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Search Jobs"}
            </button>
          </div>
        </form>

        {/* Help Drawer inside the modal */}
        {showHelp && (
          <div className="absolute inset-0 z-[90] rounded-3xl bg-slate-950/95 ring-1 ring-white/10">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-lg font-semibold text-white">How to get results with Adzuna</h3>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-200">
                <div className="mb-4">
                  <strong className="text-white">Supported countries</strong>
                  <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {SUPPORTED_COUNTRIES_INFO.map((c) => (
                      <li key={c.iso} className="text-slate-300">{c.name} ({c.iso})</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-slate-400">
                    If you type a non-supported country (e.g., Qatar, UAE, Ireland), you'll see an inline "Invalid country" warning.
                    Cities/regions (e.g., Sydney, NSW, London) are fine.
                  </p>
                </div>

                <div className="mb-4">
                  <strong className="text-white">Keyword tips</strong>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                    <li>Use common titles: <code>primary school teacher</code>, <code>primary teacher</code>, <code>secondary teacher</code>, <code>high school teacher</code>, <code>maths teacher</code>.</li>
                    <li>Broaden with OR: <code>primary teacher OR "elementary teacher"</code>.</li>
                    <li>Keep <code>category</code> to <code>teaching</code> (we map to Adzuna's <code>teaching-jobs</code>).</li>
                    <li>Prefer a country or major city/region in Location (e.g., "Australia", "Sydney", "NSW").</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <strong className="text-white">International-friendly roles</strong>
                  <p className="mt-2 text-slate-300">
                    Choose <b>International-friendly</b> in Hire Type to prioritise ads that mention sponsorship/relocation/overseas applicants.
                    Your workflow can filter titles/descriptions with those signals.
                  </p>
                </div>

                <div className="text-slate-400">
                  Still stuck? Try a broader keyword (e.g., "teacher") and refine on the dashboard.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}