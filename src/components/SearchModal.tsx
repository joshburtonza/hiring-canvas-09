import * as React from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* -----------------------------------------------------------
   GlassSelect — custom, stylable select (no external libs)
   - Accessible roles (combobox/listbox/option)
   - Keyboard: Enter/Space toggle, ↑/↓ navigate, Esc close
   - Portal-based menu; positions under trigger
----------------------------------------------------------- */
type Option<T extends string | number> = { value: T; label: string };

function GlassSelect<T extends string | number>({
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
    // set initial highlight to current selection
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === value),
    );
    setHighlight(idx === -1 ? 0 : idx);
  }

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!triggerRef.current) return;
      const trg = triggerRef.current;
      const menu = document.getElementById("glass-select-menu");
      if (menu && (menu.contains(e.target as Node) || trg.contains(e.target as Node))) return;
      close();
    };
    const onWin = () => {
      // reposition on resize/scroll
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
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
  }, [open, value, options.length]);

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
          id="glass-select-menu"
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
        document.body,
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
        <svg
          className="ml-3 h-4 w-4 opacity-70"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
        </svg>
      </button>
      {menu}
    </>
  );
}

/* -----------------------------------------------------------
   Search Modal (uses GlassSelect)
----------------------------------------------------------- */
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
  webhookUrl?: string; // e.g. "/search-trigger"
  onSubmit?: (payload: SearchPayload) => Promise<void> | void;
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
  webhookUrl,
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
      const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open, defaults]);

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
      } else {
        // Send directly to n8n webhook
        const response = await fetch('https://soarai.app.n8n.cloud/webhook/edu-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
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
                { value: 90, label: "Last 90 days" }
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
                { value: "part_time", label: "Part-time" }
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
            className="h-11 rounded-full bg-[rgb(96,141,196)]/85 font-semibold text-white hover:bg-[rgb(96,141,196)]"
          >
            Search Jobs
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}