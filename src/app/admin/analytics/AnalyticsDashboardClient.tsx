"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  MapPin,
  Users,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  CheckCircle2,
  PhoneCall,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  BarChart2,
  PieChart as PieIcon,
  RefreshCw,
} from "lucide-react";
import type {
  AnalyticsReportData,
  AreaStatusMetric,
  StaffAnalyticsMetric,
  YearCohortMetric,
} from "@/lib/analytics-shared";

interface Props {
  initialData: AnalyticsReportData;
  currentUserRole: string;
  isScopedStaff: boolean;
}

export default function AnalyticsDashboardClient({
  initialData,
  currentUserRole,
  isScopedStaff,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"overview" | "areas" | "staff" | "cohorts">("overview");
  const [areaSearch, setAreaSearch] = useState("");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [minLeadsThreshold, setMinLeadsThreshold] = useState<number>(1);

  const currentYear = searchParams.get("year") || "all";
  const currentArea = searchParams.get("area") || "all";
  const currentStaff = searchParams.get("staff") || "all";
  const currentService = searchParams.get("service") || "all";

  const {
    summary,
    areaMetrics,
    staffMetrics,
    yearCohorts,
    availableYears,
    availableAreas,
    availableStaff,
  } = initialData;

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  // Filtered Area Metrics based on search & threshold
  const filteredAreaMetrics = useMemo(() => {
    return areaMetrics.filter((a) => {
      if (a.total < minLeadsThreshold) return false;
      if (areaSearch.trim()) {
        return a.area.toLowerCase().includes(areaSearch.trim().toLowerCase());
      }
      return true;
    });
  }, [areaMetrics, areaSearch, minLeadsThreshold]);

  // Top 10 areas for visual chart
  const top10ChartAreas = useMemo(() => {
    return areaMetrics
      .filter((a) => a.area !== "Unknown" && a.area !== "Unspecified")
      .slice(0, 10);
  }, [areaMetrics]);

  // Max total for relative chart scaling
  const maxAreaTotal = useMemo(() => {
    return Math.max(...top10ChartAreas.map((a) => a.total), 10);
  }, [top10ChartAreas]);

  // 1-Click CSV Export for Executive Reporting
  const exportMatrixCSV = () => {
    const headers = [
      "Area",
      "Total Leads",
      "Booked Leads",
      "Conversion Rate (%)",
      "Follow-Up",
      "Contacted",
      "Call Not Responded",
      "New (Uncalled)",
      "Cancelled",
      ...availableYears.map((yr) => `${yr} Booked`),
      ...availableYears.map((yr) => `${yr} Total`),
    ];

    const rows = filteredAreaMetrics.map((a) => [
      `"${a.area.replace(/"/g, '""')}"`,
      a.total,
      a.booked,
      `${a.conversionRate}%`,
      a.followUp,
      a.contacted,
      a.callNotResponded,
      a.new,
      a.cancelled,
      ...availableYears.map((yr) => a.yearBreakdown[yr]?.booked ?? 0),
      ...availableYears.map((yr) => a.yearBreakdown[yr]?.total ?? 0),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `klicseo_decision_analytics_${currentYear}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Year Switcher */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B1E3D] via-[#07142A] to-[#040C1A] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#E8CC7A]">
                <TrendingUp size={16} />
              </span>
              <span className="text-xs uppercase tracking-widest text-[#E8CC7A] font-bold">
                Executive Intelligence
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Business Decision Analytics
            </h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Multi-dimensional Area × Year × Lead Status matrix and staff conversion attribution.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={exportMatrixCSV}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 hover:text-white transition-all inline-flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} className="text-[#C9A84C]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* YEAR SELECTOR TABS: All Years Combined + Separate Years */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar size={13} /> Year:
          </span>

          {/* All Years Combined Tab */}
          <button
            type="button"
            onClick={() => updateParam("year", "all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
              currentYear === "all"
                ? "bg-[#C9A84C] text-[#050E21] shadow-lg shadow-[#C9A84C]/20 ring-1 ring-[#E8CC7A]"
                : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Layers size={13} />
            <span>All Years Combined</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                currentYear === "all" ? "bg-[#050E21]/20 text-[#050E21]" : "bg-white/10 text-white/60"
              }`}
            >
              {yearCohorts.reduce((sum, y) => sum + y.totalLeads, 0).toLocaleString()}
            </span>
          </button>

          {/* Individual Separate Year Tabs */}
          {availableYears.map((yr) => {
            const cohort = yearCohorts.find((y) => y.year === yr);
            const isSelected = currentYear === yr;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => updateParam("year", yr)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? "bg-[#C9A84C] text-[#050E21] shadow-lg shadow-[#C9A84C]/20 ring-1 ring-[#E8CC7A]"
                    : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                <span>{yr} Leads</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isSelected ? "bg-[#050E21]/20 text-[#050E21]" : "bg-white/10 text-white/60"
                  }`}
                >
                  {(cohort?.totalLeads ?? 0).toLocaleString()}
                </span>
                {cohort && cohort.bookedCount > 0 && (
                  <span
                    className={`text-[10px] ${
                      isSelected ? "text-[#050E21]/80" : "text-emerald-400"
                    }`}
                  >
                    ({cohort.bookedCount} booked)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Global Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl border border-white/10 bg-[#07142A]/80 backdrop-blur flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Filter size={12} /> Filters:
          </span>

          {/* Area Selector Dropdown */}
          <select
            value={currentArea}
            onChange={(e) => updateParam("area", e.target.value)}
            className="bg-[#0B1E3D] border border-white/10 text-white/90 rounded-lg px-2.5 py-1.5 font-medium outline-none focus:border-[#C9A84C] transition-colors"
          >
            <option value="all">All Areas ({availableAreas.length})</option>
            {availableAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Staff Selector Dropdown */}
          {!isScopedStaff && (
            <select
              value={currentStaff}
              onChange={(e) => updateParam("staff", e.target.value)}
              className="bg-[#0B1E3D] border border-white/10 text-white/90 rounded-lg px-2.5 py-1.5 font-medium outline-none focus:border-[#C9A84C] transition-colors"
            >
              <option value="all">All Staff ({availableStaff.length})</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Active Filter Clear */}
          {(currentYear !== "all" || currentArea !== "all" || currentStaff !== "all") && (
            <button
              type="button"
              onClick={() => {
                router.push(pathname);
              }}
              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-medium transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            Overview & Graphs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("areas")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === "areas"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            Area Matrix ({areaMetrics.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === "staff"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            Staff Attribution ({staffMetrics.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cohorts")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === "cohorts"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            YoY Cohorts
          </button>
        </div>
      </div>

      {/* 3. Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Leads */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#07142A] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Total Leads</span>
            <Layers size={14} className="text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary.totalLeads.toLocaleString()}
            </div>
            <div className="text-[11px] text-sky-300/80 mt-0.5">
              {currentYear === "all" ? "All cohorts combined" : `${currentYear} registration cohort`}
            </div>
          </div>
        </div>

        {/* Booked Leads */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Booked Leads</span>
            <CheckCircle2 size={14} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-300 tracking-tight">
              {summary.totalBooked.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5 font-medium">
              {summary.conversionRate}% Conversion Rate
            </div>
          </div>
        </div>

        {/* Active Follow-ups */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Follow-Up Pipeline</span>
            <Clock size={14} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-300 tracking-tight">
              {summary.totalFollowUp.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-0.5">Active prospects</div>
          </div>
        </div>

        {/* Call Not Responded */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#07142A] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Not Responded</span>
            <PhoneCall size={14} className="text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-300 tracking-tight">
              {summary.totalNotResponded.toLocaleString()}
            </div>
            <div className="text-[11px] text-purple-300/80 mt-0.5">For callback attempt</div>
          </div>
        </div>

        {/* Top Area */}
        <div className="p-4 rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#E8CC7A] text-xs font-semibold">
            <span>Top Area</span>
            <MapPin size={14} />
          </div>
          <div className="mt-2 truncate">
            <div className="text-base sm:text-lg font-bold text-white truncate" title={summary.topArea?.name}>
              {summary.topArea?.name || "N/A"}
            </div>
            <div className="text-[11px] text-[#E8CC7A] mt-0.5 font-semibold">
              {summary.topArea ? `${summary.topArea.booked} booked (${summary.topArea.conversionRate}%)` : "0"}
            </div>
          </div>
        </div>

        {/* Top Staff */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#07142A] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Top Telecaller</span>
            <Award size={14} className="text-[#C9A84C]" />
          </div>
          <div className="mt-2 truncate">
            <div className="text-base sm:text-lg font-bold text-white truncate" title={summary.topStaff?.name}>
              {summary.topStaff?.name || "N/A"}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
              {summary.topStaff ? `${summary.topStaff.booked} booked (${summary.topStaff.conversionRate}%)` : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN TAB CONTENT */}

      {/* TAB 1: OVERVIEW & INTERACTIVE GRAPHS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top 10 Areas Status Distribution Chart */}
          <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart2 size={18} className="text-[#C9A84C]" />
                  Top Localities by Lead Volume & Booking Status
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Visual distribution of Booked vs Follow-Up vs CNR vs New leads per locality.
                </p>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-3 text-[11px] font-semibold flex-wrap">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Booked
                </span>
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Follow-Up
                </span>
                <span className="inline-flex items-center gap-1 text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Contacted
                </span>
                <span className="inline-flex items-center gap-1 text-purple-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> CNR
                </span>
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> New / Draft
                </span>
              </div>
            </div>

            {/* Stacked Bars */}
            <div className="space-y-3.5">
              {top10ChartAreas.map((a) => {
                const bookedPct = (a.booked / a.total) * 100;
                const followPct = (a.followUp / a.total) * 100;
                const contactedPct = (a.contacted / a.total) * 100;
                const cnrPct = (a.callNotResponded / a.total) * 100;
                const widthPct = Math.max(15, (a.total / maxAreaTotal) * 100);

                return (
                  <div key={a.area} className="group">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <button
                        type="button"
                        onClick={() => updateParam("area", a.area)}
                        className="text-white hover:text-[#E8CC7A] transition-colors flex items-center gap-1 text-left"
                      >
                        <MapPin size={12} className="text-[#C9A84C]" />
                        <span>{a.area}</span>
                        <span className="text-white/40 text-[11px] font-normal">({a.total} leads)</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold text-[11px]">
                          {a.booked} Booked ({a.conversionRate}%)
                        </span>
                        {a.followUp > 0 && (
                          <span className="text-amber-400 text-[11px]">
                            {a.followUp} Follow-Up
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar with Tooltips */}
                    <div
                      className="h-4 bg-white/5 rounded-full overflow-hidden flex transition-all duration-300 border border-white/5"
                      style={{ width: `${widthPct}%` }}
                    >
                      {/* Booked */}
                      {a.booked > 0 && (
                        <div
                          style={{ width: `${bookedPct}%` }}
                          className="bg-emerald-500 hover:bg-emerald-400 transition-colors relative group/seg"
                          title={`${a.area}: ${a.booked} Booked (${Math.round(bookedPct)}%)`}
                        />
                      )}
                      {/* Follow-Up */}
                      {a.followUp > 0 && (
                        <div
                          style={{ width: `${followPct}%` }}
                          className="bg-amber-500 hover:bg-amber-400 transition-colors"
                          title={`${a.area}: ${a.followUp} Follow-Up (${Math.round(followPct)}%)`}
                        />
                      )}
                      {/* Contacted */}
                      {a.contacted > 0 && (
                        <div
                          style={{ width: `${contactedPct}%` }}
                          className="bg-sky-500 hover:bg-sky-400 transition-colors"
                          title={`${a.area}: ${a.contacted} Contacted (${Math.round(contactedPct)}%)`}
                        />
                      )}
                      {/* CNR */}
                      {a.callNotResponded > 0 && (
                        <div
                          style={{ width: `${cnrPct}%` }}
                          className="bg-purple-500 hover:bg-purple-400 transition-colors"
                          title={`${a.area}: ${a.callNotResponded} Call Not Responded (${Math.round(cnrPct)}%)`}
                        />
                      )}
                      {/* Remaining New / Draft */}
                      <div
                        className="flex-1 bg-slate-700 hover:bg-slate-600 transition-colors"
                        title={`${a.area}: ${a.new + a.draft} New / Uncalled`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* YoY Comparison Grid */}
          <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-[#C9A84C]" />
              Year-over-Year Cohort Performance Comparison
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {yearCohorts.map((yc) => (
                <div
                  key={yc.year}
                  onClick={() => updateParam("year", yc.year)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    currentYear === yc.year
                      ? "border-[#C9A84C] bg-[#C9A84C]/10 shadow-lg shadow-[#C9A84C]/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-white">📁 {yc.year} Leads</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      {yc.conversionRate}% Booked
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-white/70">
                    <div className="flex justify-between">
                      <span className="text-white/50">Total Leads:</span>
                      <span className="font-semibold text-white">{yc.totalLeads.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Booked Leads:</span>
                      <span className="font-bold text-emerald-400">{yc.bookedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Follow-Up:</span>
                      <span className="font-medium text-amber-400">{yc.followUpCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Top Locality:</span>
                      <span className="font-medium text-white truncate">{yc.topAreaName} ({yc.topAreaBooked} booked)</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 text-right">
                    <span className="text-[11px] font-bold text-[#E8CC7A] inline-flex items-center gap-1">
                      Filter to {yc.year} <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AREA DECISION MATRIX */}
      {activeTab === "areas" && (
        <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin size={18} className="text-[#C9A84C]" />
                Area × Year × Status Decision Matrix
              </h3>
              <p className="text-xs text-white/60">
                Detailed locality breakdown with conversion rates and multi-year comparisons.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search locality..."
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  className="bg-[#0B1E3D] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-[#C9A84C] outline-none"
                />
              </div>

              <select
                value={minLeadsThreshold}
                onChange={(e) => setMinLeadsThreshold(parseInt(e.target.value, 10))}
                className="bg-[#0B1E3D] border border-white/10 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none"
              >
                <option value={1}>Min: 1+ lead</option>
                <option value={10}>Min: 10+ leads</option>
                <option value={50}>Min: 50+ leads</option>
                <option value={100}>Min: 100+ leads</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B1E3D] text-white/70 font-semibold border-b border-white/10">
                  <th className="py-3 px-4">Area / Locality</th>
                  <th className="py-3 px-3 text-right">Total Leads</th>
                  <th className="py-3 px-3 text-right text-emerald-400">Booked</th>
                  <th className="py-3 px-3 text-right text-emerald-400">Conversion %</th>
                  <th className="py-3 px-3 text-right text-amber-400">Follow-Up</th>
                  <th className="py-3 px-3 text-right text-purple-400">CNR</th>
                  <th className="py-3 px-3 text-right text-slate-400">New</th>
                  {availableYears.map((yr) => (
                    <th key={yr} className="py-3 px-3 text-right text-[#E8CC7A] bg-white/[0.02]">
                      {yr} Booked
                    </th>
                  ))}
                  <th className="py-3 px-4">Assigned Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAreaMetrics.map((a) => (
                  <tr key={a.area} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-[#C9A84C]" />
                        <span>{a.area}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">{a.total.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">{a.booked}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        a.conversionRate >= 10
                          ? "bg-emerald-500/20 text-emerald-300"
                          : a.conversionRate > 0
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-white/40"
                      }`}>
                        {a.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-amber-400">{a.followUp}</td>
                    <td className="py-3 px-3 text-right font-medium text-purple-400">{a.callNotResponded}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-400">{a.new + a.draft}</td>

                    {/* Year Cohort breakdown columns */}
                    {availableYears.map((yr) => {
                      const yStat = a.yearBreakdown[yr];
                      return (
                        <td key={yr} className="py-3 px-3 text-right bg-white/[0.01]">
                          {yStat && yStat.total > 0 ? (
                            <span className="text-[11px] font-medium text-white/80">
                              <span className="font-bold text-emerald-400">{yStat.booked}</span>
                              <span className="text-white/40"> / {yStat.total}</span>
                            </span>
                          ) : (
                            <span className="text-white/20">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Assigned Staff */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {a.assignedStaffBreakdown.length > 0 ? (
                          a.assignedStaffBreakdown.slice(0, 3).map((s) => (
                            <span
                              key={s.staffId}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/80"
                            >
                              {s.staffName} ({s.booked}b / {s.total}L)
                            </span>
                          ))
                        ) : (
                          <span className="text-white/30 text-[11px]">Unassigned</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF ATTRIBUTION & PERFORMANCE */}
      {activeTab === "staff" && (
        <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-[#C9A84C]" />
                Staff Lead Attribution & Conversion Performance
              </h3>
              <p className="text-xs text-white/60">
                Track which telecallers are converting leads in which areas and across which year cohorts.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {staffMetrics.map((sm) => {
              const isExpanded = expandedStaffId === sm.adminUserId;
              return (
                <div
                  key={sm.adminUserId}
                  className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedStaffId(isExpanded ? null : sm.adminUserId)}
                    className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C]/20 to-sky-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                        {sm.staffName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{sm.staffName}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            {sm.conversionRate}% Conversion
                          </span>
                        </div>
                        <div className="text-xs text-white/50">{sm.email}</div>
                      </div>
                    </div>

                    {/* Status metrics badges */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <div className="text-center px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-white/40 text-[10px] uppercase font-bold">Assigned</div>
                        <div className="text-sm font-bold text-white">{sm.totalAssigned}</div>
                      </div>

                      <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                        <div className="text-emerald-400 text-[10px] uppercase font-bold">Booked</div>
                        <div className="text-sm font-bold text-emerald-300">{sm.bookedCount}</div>
                      </div>

                      <div className="text-center px-3 py-1.5 rounded-lg bg-amber-950/20 border border-amber-500/30">
                        <div className="text-amber-400 text-[10px] uppercase font-bold">Follow-Up</div>
                        <div className="text-sm font-bold text-amber-300">{sm.followUpCount}</div>
                      </div>

                      <div className="text-center px-3 py-1.5 rounded-lg bg-purple-950/20 border border-purple-500/30">
                        <div className="text-purple-400 text-[10px] uppercase font-bold">CNR</div>
                        <div className="text-sm font-bold text-purple-300">{sm.notRespondedCount}</div>
                      </div>

                      <div className="text-center px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">New / Pending</div>
                        <div className="text-sm font-bold text-slate-300">{sm.newCount}</div>
                      </div>

                      <div className="text-white/40 ml-2">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Area & Year Breakdown Drawer */}
                  {isExpanded && (
                    <div className="p-4 bg-[#050E21] border-t border-white/10 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Top Areas for this Staff */}
                        <div>
                          <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <MapPin size={12} className="text-[#C9A84C]" />
                            Top Areas Handled by {sm.staffName}
                          </h4>
                          <div className="space-y-1.5">
                            {sm.topAreas.slice(0, 5).map((a) => (
                              <div
                                key={a.area}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                              >
                                <span className="font-semibold text-white">{a.area}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-400 font-bold">{a.booked} booked</span>
                                  <span className="text-white/40">/ {a.total} leads</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                                    {a.conversionRate}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Year Breakdown for this Staff */}
                        <div>
                          <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Calendar size={12} className="text-[#C9A84C]" />
                            Cohort Performance for {sm.staffName}
                          </h4>
                          <div className="space-y-1.5">
                            {availableYears.map((yr) => {
                              const yb = sm.yearBreakdown[yr];
                              return (
                                <div
                                  key={yr}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                                >
                                  <span className="font-semibold text-white">📁 {yr} Leads</span>
                                  {yb && yb.total > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-emerald-400 font-bold">{yb.booked} booked</span>
                                      <span className="text-white/40">/ {yb.total} leads</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                                        {yb.conversionRate}%
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-white/30 text-[11px]">0 leads</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: YOY COHORTS */}
      {activeTab === "cohorts" && (
        <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-[#C9A84C]" />
              Year-over-Year Cohort Detailed Breakdown
            </h3>
            <p className="text-xs text-white/60">
              Deep dive into lead vintage performance comparing 2024, 2025, and 2026 batches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {yearCohorts.map((yc) => (
              <div
                key={yc.year}
                className="p-5 rounded-xl border border-white/10 bg-gradient-to-b from-[#0B1E3D] to-[#07142A] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-bold text-white">📁 {yc.year} Cohort</h4>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                    {yc.conversionRate}% Booked
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Total Leads Registered:</span>
                    <span className="font-bold text-white">{yc.totalLeads.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Booked Conversions:</span>
                    <span className="font-bold text-emerald-400">{yc.bookedCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Follow-Up Pipeline:</span>
                    <span className="font-medium text-amber-400">{yc.followUpCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Top Performing Locality:</span>
                    <span className="font-semibold text-white">{yc.topAreaName} ({yc.topAreaBooked}b)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateParam("year", yc.year)}
                  className="w-full py-2 rounded-xl bg-[#C9A84C] text-[#050E21] font-bold text-xs hover:bg-[#E8CC7A] transition-colors shadow-sm"
                >
                  View {yc.year} Detailed Dashboard
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
