"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  X,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { fetchStaffTimelineAction } from "./actions";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_COLOR,
  type LeadStatus,
} from "@/lib/leads-shared";
import type { StaffDailyMetric, StaffTimelineEvent } from "@/lib/reports-shared";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffDailyMetric;
  date?: string;
  startDate?: string;
  endDate?: string;
  isAllTime?: boolean;
  displayLabel?: string;
}

export default function StaffTimelineModal({
  isOpen,
  onClose,
  staff,
  date,
  startDate,
  endDate,
  isAllTime,
  displayLabel,
}: Props) {
  const [events, setEvents] = useState<StaffTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    startTransition(async () => {
      const res = await fetchStaffTimelineAction(staff.email, {
        date,
        startDate,
        endDate,
        isAllTime,
      });
      if (res.ok && res.events) {
        setEvents(res.events);
      } else {
        setError(res.error || "Failed to load timeline.");
      }
      setLoading(false);
    });
  }, [isOpen, staff.email, date, startDate, endDate, isAllTime]);

  if (!isOpen) return null;

  const headerLabel =
    displayLabel ||
    (isAllTime
      ? "All-Time Calling Activity"
      : date
      ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : `${startDate || ""} to ${endDate || ""}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#071228] border border-white/15 rounded-3xl p-4 sm:p-7 shadow-2xl space-y-5 sm:space-y-6 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3 sm:pb-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <PhoneCall size={18} />
              </div>
              <div className="min-w-0">
                <h3
                  className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  <span className="truncate">{staff.name}</span>
                  <span className="text-[11px] sm:text-xs font-normal text-white/50 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {headerLabel}
                  </span>
                </h3>
                <p className="text-xs text-white/50 truncate">{staff.email}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-9 w-9 place-items-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Daily Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0">
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Total Calls</div>
            <div className="text-lg font-bold text-white tabular-nums">{staff.totalCalls}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">🏆 Booked</div>
            <div className="text-lg font-bold text-emerald-400 tabular-nums">{staff.bookedCount}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30">
            <div className="text-[10px] uppercase font-bold text-sky-300 tracking-wider">🔄 Contacted</div>
            <div className="text-lg font-bold text-sky-400 tabular-nums">{staff.contactedCount}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">📅 Follow-up</div>
            <div className="text-lg font-bold text-amber-400 tabular-nums">{staff.followUpCount}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
            <div className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">📵 No Answer</div>
            <div className="text-lg font-bold text-rose-400 tabular-nums">{staff.notRespondedCount}</div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Timeline Events Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-16 text-center text-white/40 text-xs flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <span>Loading call timeline for {staff.name}…</span>
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-white/40 text-xs rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
              No call activity logged for {staff.name} on this date.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
              {events.map((evt, idx) => {
                const status = evt.statusTo;
                const statusColor = status ? LEAD_STATUS_COLOR[status] : "#9CA3AF";
                const statusLabel = status ? LEAD_STATUS_LABEL[status] : "Call Activity";

                return (
                  <div key={evt.id || idx} className="relative group">
                    {/* Dot on timeline */}
                    <div
                      className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-[#071228] transition-transform group-hover:scale-125"
                      style={{ backgroundColor: statusColor }}
                    />

                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-all space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                            style={{
                              backgroundColor: `${statusColor}20`,
                              color: statusColor,
                              border: `1px solid ${statusColor}40`,
                            }}
                          >
                            {statusLabel}
                          </span>
                          {evt.leadName && (
                            <span className="text-xs font-bold text-white">
                              {evt.leadName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-white/40 tabular-nums">
                          <Clock size={12} />
                          <span>{evt.timeFormatted}</span>
                        </div>
                      </div>

                      {/* Lead contextual details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/60">
                        {evt.leadPhone && (
                          <div className="flex items-center gap-1">
                            <Phone size={11} className="text-white/30" />
                            <span>{evt.leadPhone}</span>
                          </div>
                        )}
                        {evt.leadArea && (
                          <div className="flex items-center gap-1">
                            <MapPin size={11} className="text-white/30" />
                            <span>{evt.leadArea}</span>
                          </div>
                        )}
                        {evt.leadService && (
                          <div className="flex items-center gap-1">
                            <span className="text-white/30">Service:</span>
                            <span className="text-white/80">{evt.leadService}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes / Summary */}
                      {evt.summary && (
                        <p className="text-xs text-white/70 bg-black/20 p-2 rounded-xl border border-white/[0.04]">
                          {evt.summary}
                        </p>
                      )}

                      {/* Link to Lead Detail */}
                      {evt.leadId && (
                        <div className="pt-1 flex justify-end">
                          <Link
                            href={`/admin/${evt.leadId}?returnTo=${encodeURIComponent("/admin/reports")}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 font-medium transition-colors"
                          >
                            <span>Open Lead Details</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] pt-3 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/15 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
