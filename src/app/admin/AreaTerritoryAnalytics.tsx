"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  TrendingUp,
  CheckCircle2,
  PhoneCall,
  Clock,
  Car,
  Wrench,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Layers,
  Zap,
  Sparkles,
} from "lucide-react";
import type { AreaTerritoryAnalyticsData } from "@/lib/analytics-shared";
import FolderAllocationButton from "./FolderAllocationButton";
import type { LeadListRow } from "@/lib/leadLists-shared";

interface Props {
  data: AreaTerritoryAnalyticsData;
  folder?: string;
  adminUsers?: { id: string; email: string; name: string }[];
  leadLists?: LeadListRow[];
  canManage?: boolean;
}

export default function AreaTerritoryAnalytics({
  data,
  folder,
  adminUsers = [],
  leadLists = [],
  canManage = true,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    area,
    year,
    totalLeads,
    bookedCount,
    contactedCount,
    followUpCount,
    newCount,
    lostCount,
    conversionRate,
    allocatedCount,
    unallocatedCount,
    allocationRate,
    estimatedRevenue,
    topCarBrands,
    topServices,
    yearComparison,
  } = data;

  const inPipelineCount = contactedCount + followUpCount;

  // Calculate funnel percentages
  const pctBooked = totalLeads > 0 ? (bookedCount / totalLeads) * 100 : 0;
  const pctFollowUp = totalLeads > 0 ? (followUpCount / totalLeads) * 100 : 0;
  const pctContacted = totalLeads > 0 ? (contactedCount / totalLeads) * 100 : 0;
  const pctNew = totalLeads > 0 ? (newCount / totalLeads) * 100 : 0;
  const pctLost = totalLeads > 0 ? (lostCount / totalLeads) * 100 : 0;

  return (
    <div className="rounded-3xl bg-[#071228] border border-white/[0.08] p-5 shadow-xl space-y-5 transition-all">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center text-[#C9A84C]">
            <MapPin size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#E8CC7A]">
                📍 {area} Territory Intelligence
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70 border border-white/10">
                {year} Cohort
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Performance metrics, status funnel, and vehicle distribution for {area} in {year}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canManage && (
            <FolderAllocationButton
              folder={folder}
              area={area}
              folderName={`${year} × ${area}`}
              adminUsers={adminUsers}
              lists={leadLists}
              availableAreas={[area]}
              variant="toolbar"
            />
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all inline-flex items-center gap-1.5"
          >
            <BarChart3 size={13} className="text-[#C9A84C]" />
            <span>{isExpanded ? "Hide Graphs" : "Show Graphs"}</span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* 2. Top Territory KPI Strip (5 Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Tile 1: Total Leads */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1">
            <span>Territory Pool</span>
            <Users size={14} className="text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-white tabular-nums">
            {totalLeads.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">
            {year} registered leads
          </div>
        </div>

        {/* Tile 2: Booked & Conversion */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20">
          <div className="flex items-center justify-between text-emerald-400/80 text-[10px] font-semibold uppercase tracking-wider mb-1">
            <span>Booked Clients</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 tabular-nums flex items-baseline gap-1.5">
            <span>{bookedCount.toLocaleString("en-IN")}</span>
            <span className="text-xs font-bold text-emerald-300/80">({conversionRate}%)</span>
          </div>
          <div className="text-[10px] text-emerald-400/60 mt-0.5">
            Territory conversion
          </div>
        </div>

        {/* Tile 3: Active Pipeline */}
        <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20">
          <div className="flex items-center justify-between text-amber-400/80 text-[10px] font-semibold uppercase tracking-wider mb-1">
            <span>In Pipeline</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-300 tabular-nums">
            {inPipelineCount.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-amber-400/60 mt-0.5">
            {followUpCount} Follow-up · {contactedCount} Contacted
          </div>
        </div>

        {/* Tile 4: Allocation Rate */}
        <div className="p-3.5 rounded-2xl bg-purple-500/[0.04] border border-purple-500/20">
          <div className="flex items-center justify-between text-purple-400/80 text-[10px] font-semibold uppercase tracking-wider mb-1">
            <span>Allocated Pool</span>
            <Zap size={14} className="text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-purple-300 tabular-nums flex items-baseline gap-1.5">
            <span>{allocatedCount.toLocaleString("en-IN")}</span>
            <span className="text-xs font-bold text-purple-300/80">({allocationRate}%)</span>
          </div>
          <div className="text-[10px] text-purple-400/60 mt-0.5">
            {unallocatedCount} unallocated pool
          </div>
        </div>

        {/* Tile 5: Estimated Revenue */}
        <div className="p-3.5 rounded-2xl bg-[#C9A84C]/[0.05] border border-[#C9A84C]/25 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#E8CC7A] text-[10px] font-semibold uppercase tracking-wider mb-1">
            <span>Territory Value</span>
            <Sparkles size={14} className="text-[#C9A84C]" />
          </div>
          <div className="text-xl font-extrabold text-[#E8CC7A] tabular-nums">
            ₹{estimatedRevenue.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#C9A84C]/70 mt-0.5">
            Confirmed bookings GMV
          </div>
        </div>
      </div>

      {/* 3. Pipeline Funnel Distribution Bar */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-white/60">Territory Pipeline Funnel</span>
          <span className="text-white/40">{totalLeads} total records</span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="h-3.5 w-full rounded-full bg-white/5 overflow-hidden flex p-0.5 gap-0.5 border border-white/10 shadow-inner">
          {pctBooked > 0 && (
            <div
              style={{ width: `${pctBooked}%` }}
              className="h-full bg-emerald-500 rounded-sm transition-all relative group"
              title={`Booked: ${bookedCount} (${Math.round(pctBooked)}%)`}
            />
          )}
          {pctFollowUp > 0 && (
            <div
              style={{ width: `${pctFollowUp}%` }}
              className="h-full bg-amber-400 rounded-sm transition-all"
              title={`Follow-Up: ${followUpCount} (${Math.round(pctFollowUp)}%)`}
            />
          )}
          {pctContacted > 0 && (
            <div
              style={{ width: `${pctContacted}%` }}
              className="h-full bg-sky-400 rounded-sm transition-all"
              title={`Contacted: ${contactedCount} (${Math.round(pctContacted)}%)`}
            />
          )}
          {pctNew > 0 && (
            <div
              style={{ width: `${pctNew}%` }}
              className="h-full bg-blue-500 rounded-sm transition-all"
              title={`New: ${newCount} (${Math.round(pctNew)}%)`}
            />
          )}
          {pctLost > 0 && (
            <div
              style={{ width: `${pctLost}%` }}
              className="h-full bg-rose-500/80 rounded-sm transition-all"
              title={`CNR / Cancelled: ${lostCount} (${Math.round(pctLost)}%)`}
            />
          )}
        </div>

        {/* Legend pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Booked: <strong>{bookedCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Follow-Up: <strong>{followUpCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Contacted: <strong>{contactedCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>New: <strong>{newCount}</strong></span>
          </div>
          {lostCount > 0 && (
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>CNR/Lost: <strong>{lostCount}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Deep-Dive Analytics Grid (Expanded Mode) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-white/[0.06] animate-in fade-in duration-200">
          {/* Card A: 🚗 Top Vehicle Makers in this Territory */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Car size={14} className="text-[#C9A84C]" />
                <span>Top Car Makers in {area}</span>
              </h4>
              <span className="text-[10px] text-white/40">Market share</span>
            </div>

            {topCarBrands.length === 0 ? (
              <p className="text-xs text-white/40 py-3">Vehicle data not specified for this area.</p>
            ) : (
              <div className="space-y-2.5">
                {topCarBrands.map((b) => (
                  <div key={b.brand} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-white/90">{b.brand}</span>
                      <span className="text-white/50 tabular-nums">
                        <strong>{b.count}</strong> ({b.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(5, b.percentage))}%` }}
                        className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card B: 🛠️ Popular Services in this Territory */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Wrench size={14} className="text-sky-400" />
                <span>Service Demand</span>
              </h4>
              <span className="text-[10px] text-white/40">Service mix</span>
            </div>

            {topServices.length === 0 ? (
              <p className="text-xs text-white/40 py-3">No specific services logged for this area.</p>
            ) : (
              <div className="space-y-2.5">
                {topServices.map((s) => (
                  <div key={s.service} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-white/90 capitalize">{s.service.replace(/_/g, " ")}</span>
                      <span className="text-white/50 tabular-nums">
                        <strong>{s.count}</strong> ({s.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(5, s.percentage))}%` }}
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card C: 📅 Year-over-Year Historical Trend for this Area */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar size={14} className="text-purple-400" />
                <span>{area} YoY Trend</span>
              </h4>
              <span className="text-[10px] text-white/40">Cohort history</span>
            </div>

            <div className="space-y-2">
              {yearComparison.map((yc) => {
                const isCurrentYear = yc.year === year;
                const maxYearCount = Math.max(...yearComparison.map((y) => y.count), 1);
                const barWidth = Math.max(8, Math.round((yc.count / maxYearCount) * 100));

                return (
                  <div
                    key={yc.year}
                    className={`p-2 rounded-xl transition-all ${
                      isCurrentYear ? "bg-white/[0.06] border border-white/10" : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className={`font-bold ${isCurrentYear ? "text-[#E8CC7A]" : "text-white/70"}`}>
                        {yc.year} Cohort
                      </span>
                      <span className="text-white/50 tabular-nums text-[10px]">
                        <strong>{yc.count}</strong> leads · <span className="text-emerald-400 font-semibold">{yc.bookedCount} booked</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className={`h-full rounded-full ${
                          isCurrentYear
                            ? "bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A]"
                            : "bg-white/20"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
