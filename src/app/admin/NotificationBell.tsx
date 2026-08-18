"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Clock, Sparkles, Phone, UserPlus, X, ArrowRight, ExternalLink } from "lucide-react";
import type { CallReminder, ReminderKind } from "@/lib/leads-shared";
import { formatPhone, telLink } from "@/lib/phone-shared";

const KIND_META: Record<
  ReminderKind,
  { label: string; badgeBg: string; textColor: string; Icon: typeof Bell }
> = {
  due: {
    label: "Call Due Today",
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    textColor: "text-amber-400",
    Icon: Clock,
  },
  new: {
    label: "New Lead",
    badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    textColor: "text-blue-400",
    Icon: Sparkles,
  },
  applied: {
    label: "Job Applicant",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    textColor: "text-emerald-400",
    Icon: UserPlus,
  },
};

export default function NotificationBell({
  items,
  align = "right",
}: {
  items: CallReminder[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  // Close on escape or outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        title="Action Reminders & Notifications"
        className={`relative grid h-9 w-9 place-items-center rounded-xl border transition-all ${
          open
            ? "border-[#C9A84C] bg-[#C9A84C]/15 text-[#E8CC7A]"
            : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#050E21]">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 ${
            align === "left" ? "left-0" : "right-0"
          } w-88 max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 bg-[#0B172E]/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Pending Actions
              </span>
              <span className="rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/30 px-2 py-0.5 text-[10px] font-bold text-[#E8CC7A]">
                {count} {count === 1 ? "task" : "tasks"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-white/5">
            {count === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/30">
                  <Sparkles size={18} />
                </div>
                <p className="text-xs font-semibold text-white/80">You’re all caught up!</p>
                <p className="text-[11px] text-white/40 mt-0.5">No overdue calls or pending new leads.</p>
              </div>
            ) : (
              items.map((it) => {
                const meta = KIND_META[it.kind] || KIND_META.new;
                const Icon = meta.Icon;

                return (
                  <div
                    key={it.id}
                    className="group relative flex items-start gap-3 p-3.5 hover:bg-white/[0.04] transition-colors"
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${meta.badgeBg}`}
                    >
                      <Icon size={14} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <Link
                          href={it.href}
                          onClick={() => setOpen(false)}
                          className="truncate text-xs font-semibold text-white group-hover:text-[#E8CC7A] transition-colors"
                        >
                          {it.name || "(Unnamed Lead)"}
                        </Link>
                        <span className={`text-[10px] font-medium ${meta.textColor}`}>
                          {it.reason}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                        {it.phone ? (
                          <a
                            href={telLink(it.phone)}
                            className="inline-flex items-center gap-1 font-mono text-[#C9A84C] hover:underline"
                          >
                            <Phone size={10} /> {formatPhone(it.phone)}
                          </a>
                        ) : (
                          <span className="text-white/30">No phone</span>
                        )}

                        <Link
                          href={it.href}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors"
                        >
                          Open <ArrowRight size={10} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {count > 0 && (
            <div className="border-t border-white/10 bg-white/[0.01] px-4 py-2.5 text-center">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-[#C9A84C] hover:underline inline-flex items-center gap-1"
              >
                Go to Leads Worklist <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
