import * as React from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type SearchPayload = {
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
  /** If you want this component to POST for you, pass your webhook/edge URL (e.g. '/search-trigger'). */
  webhookUrl?: string;
  /** Optional: intercept payload before/after POST. If provided, you control submission. */
  onSubmit?: (payload: SearchPayload) => Promise<void> | void;
  /** Initial values (optional) */
  defaults?: Partial<SearchPayload>;
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

export function SearchModal({
  open,
  onClose,
  webhookUrl, // e.g. "/search-trigger" (edge function) -> n8n webhook
  onSubmit,
  defaults,
}: Props) {
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const firstFieldRef = React.useRef<HTMLInputElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  const [form, setForm] = React.useState<SearchPayload>({
    ...defaultValues,
    ...defaults,
  });

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (open) {
      setForm((f) => ({ ...defaultValues, ...defaults, timestamp: new Date().toISOString() }));
      // focus the first field after paint
      const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open, defaults]);

  // Close on ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function update<K extends keyof SearchPayload>(key: K, val: SearchPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const payload: SearchPayload = {
      ...form,
      keywords: form.keywords.trim(),
      timestamp: new Date().toISOString(),
    };
    if (!payload.keywords) {
      toast({
        title: "Keywords required",
        description: "Please enter search keywords to continue.",
        variant: "destructive",
      });
      firstFieldRef.current?.focus();
      return;
    }
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else if (webhookUrl) {
        const { error } = await supabase.functions.invoke('search-trigger', {
          body: payload
        });
        if (error) throw error;
      }
      
      toast({
        title: "Search submitted successfully",
        description: "Your job search has been initiated. Results will appear in the dashboard shortly.",
      });
      
      onClose();
    } catch (err) {
      console.error("Search submit failed:", err);
      toast({
        title: "Search failed",
        description: "There was an error submitting your search. Please try again.",
        variant: "destructive",
      });
      // keep modal open for user to retry
    }
  }

  if (!mounted || !open) return null;

  // ---- UI ----
  const panel = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click backdrop to close
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
            <select
              value={String(form.dateRange)}
              onChange={(e) => update("dateRange", Number(e.target.value) as SearchPayload["dateRange"])}
              className="h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 outline-none focus:border-cyan-300/40"
            >
              <option value="1">Last day</option>
              <option value="7">Last week</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Contract Type</label>
            <select
              value={form.contractType || "any"}
              onChange={(e) =>
                update("contractType", (e.target.value || "any") as SearchPayload["contractType"])
              }
              className="h-11 w-full rounded-full border border-white/10 bg-black/25 px-4 outline-none focus:border-cyan-300/40"
            >
              <option value="any">Any contract type</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="temporary">Temporary</option>
              <option value="part_time">Part-time</option>
            </select>
          </div>
        </div>

        {/* Advanced toggle */}
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

        {/* Footer buttons */}
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
            className="h-11 rounded-full bg-[rgb(96,141,196)]/85 font-semibold text-white hover:bg-[rgb(96,141,196)]"
          >
            Search Jobs
          </button>
        </div>
      </form>
    </div>
  );

  // Render into a portal so parent layout (grids, transforms) can't push it bottom-right
  return createPortal(panel, document.body);
}
