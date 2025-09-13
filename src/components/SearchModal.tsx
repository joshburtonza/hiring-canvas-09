import * as React from "react";
import { createPortal } from "react-dom";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByZXZ0em9id3Rzbm9paHd5dGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjE3NjAsImV4cCI6MjA3MzIzNzc2MH0.uCCzMFl2o6MypFX4Zt2FtBzT6QnPm7JyxyKR0YQJX6Y";
/**
 * ---------- CONFIG ----------
 * n8n webhook target (GET). Uses the URL you provided.
 * If you later switch your Webhook node to POST + proper CORS, set SEND_METHOD to "POST".
 */
const N8N_WEBHOOK_URL = "https://prevtzobwtsnoihwytjg.supabase.co/functions/v1/edu-search-proxy";
const SEND_METHOD: "GET" | "POST" = "POST";

/* ========================================================================== */
/* GlassSelect — custom, stylable select (no external libs)                   */
/* ========================================================================== */

type SelectValue = string | number;
type Option<T extends SelectValue> = { value: T; label: string };

function useUniqueId(prefix = "id") {
  const [id] = React.useState(() => `${prefix}-${Math.random().toString(36).slice(2, 9)}`);
  return id;
}

function GlassSelect<T extends SelectValue>({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: Option<T>[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});
  const menuId = useUniqueId("glass-select-menu");

  const selected = options.find((o) => o.value === value);

  function close() {
    setOpen(false);
    setHighlight(-1);
  }
  function openMenu() {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: r.bottom + 8,
      left: r.left,
      width: r.width,
      zIndex: 60,
    });
    setOpen(true);
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const trg = triggerRef.current;
      const menu = document.getElementById(menuId);
      if (!trg || !menu) return;
      if (menu.contains(e.target as Node) || trg.contains(e.target as Node)) return;
      close();
    };
    const onWin = () => {
      const trg = triggerRef.current;
      if (!trg) return;
      const r = trg.getBoundingClientRect();
      setMenuStyle((s) => ({ ...s, top: r.bottom + 8, left: r.left, width: r.width }));
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, value, options.length, menuId]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) {
        onChange(opt.value);
        close();
      }
    }
  }

  const menu = open
    ? createPortal(
        <div
          id={menuId}
          style={menuStyle}
          role="listbox"
          aria-label={ariaLabel}
          className="rounded-2xl border border-white/10 bg-[rgba(17,21,27,.88)] shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl"
        >
          <ul className="max-h-[320px] overflow-auto py-2">
            {options.map((o, i) => {
              const isSel = o.value === value;
              const isHi = i === highlight;
              return (
                <li
                  key={`${o.value}`}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(o.value);
                    close();
                  }}
                  className={[
                    "mx-2 my-1 flex cursor-pointer items-center justify-between rounded-xl px-3 py-2",
                    isHi ? "bg-white/10 ring-1 ring-cyan-300/30" : "hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="text-sm text-slate-100">{o.label}</span>
                  {isSel && <span className="h-2 w-2 rounded-full bg-cyan-300" />}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        className={[
          "h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 text-left",
          "text-slate-100 placeholder:text-slate-400 outline-none focus:border-cyan-300/40",
          "flex items-center justify-between",
          className,
        ].join(" ")}
      >
        <span className={!selected ? "text-slate-400" : ""}>
          {selected ? selected.label : placeholder || "Select…"}
        </span>
        <svg className="ml-3 h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
        </svg>
      </button>
      {menu}
    </>
  );
}

/* ========================================================================== */
/* Search Modal (centered, accessible, portal, GET → n8n)                     */
/* ========================================================================== */

export type SearchPayload = {
  keywords: string;
  location?: string;
  radius?: number;
  contractType?: "permanent" | "contract" | "temporary" | "part_time" | "any";
  dateRange?: 1 | 7 | 30 | 90;
  salaryMin?: number;
  salaryMax?: number;
  category?: string;
  timestamp: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  webhookUrl?: string; // optional override (defaults to N8N_WEBHOOK_URL)
  onSubmit?: (payload: SearchPayload) => Promise<void> | void; // optional custom handler
  defaults?: Partial<SearchPayload>;
  onNotify?: (type: "success" | "error", title: string, desc?: string) => void; // optional toast hook
};

const defaultValues: SearchPayload = {
  keywords: "",
  location: "",
  radius: 0,
  contractType: "any",
  dateRange: 7,
  salaryMin: undefined,
  salaryMax: undefined,
  category: "teaching",
  timestamp: new Date().toISOString(),
};

function buildQuery(payload: SearchPayload) {
  const params = new URLSearchParams();
  params.set("keywords", payload.keywords);
  if (payload.location) params.set("location", payload.location);
  if (typeof payload.radius === "number") params.set("radius", String(payload.radius));
  if (payload.contractType) params.set("contractType", payload.contractType);
  if (payload.dateRange) params.set("dateRange", String(payload.dateRange));
  if (typeof payload.salaryMin === "number") params.set("salaryMin", String(payload.salaryMin));
  if (typeof payload.salaryMax === "number") params.set("salaryMax", String(payload.salaryMax));
  if (payload.category) params.set("category", payload.category);
  params.set("timestamp", payload.timestamp);
  params.set("source", "dashboard_search");
  return params.toString();
}

async function sendDirectToN8N(payload: SearchPayload, url: string) {
  if (SEND_METHOD === "GET") {
    const qs = buildQuery(payload);
    await fetch(`${url}?${qs}`, { method: "GET", mode: "no-cors" });
    return null;
  }
  
  // POST with proper CORS handling + Supabase Edge Function auth when applicable
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (url.includes(".supabase.co")) {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, source: "dashboard_search" }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

export default function SearchModal({
  open,
  onClose,
  webhookUrl,
  onSubmit,
  defaults,
  onNotify,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const firstFieldRef = React.useRef<HTMLInputElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  const [form, setForm] = React.useState<SearchPayload>({ ...defaultValues, ...defaults });

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...defaultValues, ...defaults, timestamp: new Date().toISOString() }));
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, defaults]);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function update<K extends keyof SearchPayload>(key: K, val: SearchPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting) return;

    const payload: SearchPayload = {
      ...form,
      keywords: form.keywords.trim(),
      timestamp: new Date().toISOString(),
    };
    if (!payload.keywords) {
      onNotify?.("error", "Keywords required", "Please enter search keywords to continue.");
      firstFieldRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const result = await sendDirectToN8N(payload, webhookUrl || N8N_WEBHOOK_URL);
        if (result) {
          console.log("Search response:", result);
        }
      }
      onNotify?.("success", "Search submitted", "Your job search has been sent successfully.");
      onClose();
    } catch (err) {
      console.error("Search submit failed:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      onNotify?.("error", "Search failed", `Could not submit search: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-[min(760px,calc(100vw-48px))] rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.06))] p-6 shadow-[0_24px_70px_rgba(0,0,0,.55)] text-slate-100"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide">Search Adzuna Jobs</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
          >
            Close
          </button>
        </div>

        {/* Keywords */}
        <label className="mb-1 block text-sm text-slate-300">Keywords *</label>
        <input
          ref={firstFieldRef}
          value={form.keywords}
          onChange={(e) => update("keywords", e.target.value)}
          placeholder="e.g. Math Teacher, Head of Department, Science..."
          className="mb-4 h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
        />

        {/* Location */}
        <label className="mb-1 block text-sm text-slate-300">Location</label>
        <input
          value={form.location || ""}
          onChange={(e) => update("location", e.target.value)}
          placeholder="e.g. London, Manchester, Birmingham..."
          className="mb-4 h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
        />

        {/* Row: Posted Within + Contract Type */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Posted Within</label>
            <GlassSelect
              aria-label="Posted Within"
              value={form.dateRange}
              onChange={(v) => update("dateRange", v as SearchPayload["dateRange"])}
              options={[
                { value: 1, label: "Last day" },
                { value: 7, label: "Last week" },
                { value: 30, label: "Last 30 days" },
                { value: 90, label: "Last 90 days" },
              ]}
              placeholder="Choose range"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Contract Type</label>
            <GlassSelect
              aria-label="Contract Type"
              value={form.contractType || "any"}
              onChange={(v) => update("contractType", v as SearchPayload["contractType"])}
              options={[
                { value: "any", label: "Any contract type" },
                { value: "permanent", label: "Permanent" },
                { value: "contract", label: "Contract" },
                { value: "temporary", label: "Temporary" },
                { value: "part_time", label: "Part-time" },
              ]}
              placeholder="Choose contract"
            />
          </div>
        </div>

        {/* Advanced */}
        <details className="mb-5 rounded-full border border-white/10 bg-black/20 p-3 open:rounded-2xl open:p-4">
          <summary className="cursor-pointer select-none text-center text-sm text-slate-200">
            Show Advanced Filters
          </summary>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Salary Min</label>
              <input
                type="number"
                min={0}
                value={Number(form.salaryMin || "")}
                onChange={(e) => update("salaryMin", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 30000"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Salary Max</label>
              <input
                type="number"
                min={0}
                value={Number(form.salaryMax || "")}
                onChange={(e) => update("salaryMax", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 60000"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Radius (miles)</label>
              <input
                type="number"
                min={0}
                value={Number(form.radius || 0)}
                onChange={(e) => update("radius", e.target.value ? Number(e.target.value) : 0)}
                placeholder="0 = anywhere"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-slate-300">Category</label>
              <input
                value={form.category || ""}
                onChange={(e) => update("category", e.target.value)}
                placeholder="e.g. teaching (leave blank for all)"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none placeholder:text-slate-400 focus:border-cyan-300/40"
              />
            </div>
          </div>
        </details>

        {/* Footer */}
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-white/10 bg-white/10 font-medium text-slate-200 hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-full bg-[rgb(96,141,196)]/85 font-semibold text-white hover:bg-[rgb(96,141,196)] disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Search Jobs"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/* ================================
   Minimal usage example:

   const [open, setOpen] = React.useState(false);
   <button onClick={() => setOpen(true)}>Search</button>
   <SearchModal open={open} onClose={() => setOpen(false)} />
================================== */