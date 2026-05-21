"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Clock, Sparkles, Phone } from "lucide-react";
import type { CallReminder, ReminderKind } from "@/lib/leads-shared";

const KIND_META: Record<ReminderKind, { color: string; Icon: typeof Bell }> = {
  due: { color: "#C9A84C", Icon: Clock },
  new: { color: "#3B82F6", Icon: Sparkles },
};

export default function NotificationBell({
  items,
  align = "left",
}: {
  items: CallReminder[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const count = items.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Call reminders"
        className="relative grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 mt-2 ${align === "right" ? "right-0" : "left-0"} w-80 max-w-[85vw] rounded-2xl border border-white/10 bg-[#0a1430] shadow-2xl overflow-hidden`}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-semibold">Call reminders</span>
              <span className="text-xs text-white/40">{count}</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {count === 0 ? (
                <p className="px-4 py-10 text-center text-white/40 text-sm">
                  You’re all caught up — no calls pending.
                </p>
              ) : (
                items.map((it) => {
                  const { color, Icon } = KIND_META[it.kind];
                  return (
                    <Link
                      key={it.id}
                      href={`/admin/${it.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
                    >
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                        style={{ background: `${color}1f`, color }}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{it.name || "(unnamed)"}</div>
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color }}>
                          {it.reason}
                        </div>
                      </div>
                      {it.phone && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/45 shrink-0">
                          <Phone size={11} /> {it.phone}
                        </span>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
