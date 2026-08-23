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
  Flame,
  Target,
  Zap,
  Activity,
  Trophy,
  ArrowRight,
  TrendingDown,
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

  const [activeTab, setActiveTab] = useState<"overview" | "heatmap" | "areas" | "staff" | "cohorts">("overview");
  const [areaSearch, setAreaSearch] = useState("");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [minLeadsThreshold, setMinLeadsThreshold] = useState<number>(1);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

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

  // Top 8 areas for visual charts
  const top8ChartAreas = useMemo(() => {
    return areaMetrics
      .filter((a) => a.area !== "Unknown" && a.area !== "Unspecified")
      .slice(0, 8);
  }, [areaMetrics]);

  // Max total for relative chart scaling
  const maxAreaTotal = useMemo(() => {
    return Math.max(...top8ChartAreas.map((a) => a.total), 10);
  }, [top8ChartAreas]);

  // High-opportunity areas (high volume, low booked) vs Hotspots (high booked)
  const insights = useMemo(() => {
    const hotZones = [...areaMetrics]
      .filter((a) => a.area !== "Unknown" && a.area !== "Unspecified" && a.booked > 0)
      .sort((a, b) => b.booked - a.booked)
      .slice(0, 3);

    const untapped = [...areaMetrics]
      .filter((a) => a.area !== "Unknown" && a.area !== "Unspecified" && a.total >= 50 && a.conversionRate < 5)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    return { hotZones, untapped };
  }, [areaMetrics]);

  // Donut chart status segments calculation
  const statusDonutSegments = useMemo(() => {
    const total = summary.totalLeads || 1;
    const items = [
      { id: "booked", label: "Booked", count: summary.totalBooked, color: "#10B981", bg: "bg-emerald-500", glow: "rgba(16, 185, 129, 0.4)" },
      { id: "follow_up", label: "Follow-Up", count: summary.totalFollowUp, color: "#F59E0B", bg: "bg-amber-500", glow: "rgba(245, 158, 11, 0.4)" },
      { id: "contacted", label: "Contacted", count: summary.totalContacted, color: "#0EA5E9", bg: "bg-sky-500", glow: "rgba(14, 165, 233, 0.4)" },
      { id: "cnr", label: "Not Responded", count: summary.totalNotResponded, color: "#A855F7", bg: "bg-purple-500", glow: "rgba(168, 85, 247, 0.4)" },
      { id: "new", label: "New / Uncalled", count: summary.totalNew, color: "#64748B", bg: "bg-slate-500", glow: "rgba(100, 116, 139, 0.2)" },
    ];

    let cumulativePct = 0;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return items.map((item) => {
      const pct = (item.count / total) * 100;
      const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((cumulativePct / 100) * circumference);
      cumulativePct += pct;

      return {
        ...item,
        pct: Math.round(pct * 10) / 10,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [summary]);

  // Top 3 Staff for Podium
  const top3Staff = useMemo(() => {
    return staffMetrics.slice(0, 3);
  }, [staffMetrics]);

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
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B1E3D] via-[#07142A] to-[#040C1A] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#C9A84C]/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#E8CC7A] shadow-inner">
                <TrendingUp size={16} />
              </span>
              <span className="text-xs uppercase tracking-widest text-[#E8CC7A] font-bold">
                Executive Decision Intelligence
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Telemetry
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Business Decision Analytics & Trends
            </h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Multi-dimensional Area × Year × Lead Status matrix, hotspot analysis, and staff conversion attribution.
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
              <span>Export Matrix CSV</span>
            </button>
          </div>
        </div>

        {/* YEAR SELECTOR TABS: All Years Combined + Separate Years */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar size={13} /> Cohort:
          </span>

          {/* All Years Combined Tab */}
          <button
            type="button"
            onClick={() => updateParam("year", "all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              currentYear === "all"
                ? "bg-[#C9A84C] text-[#050E21] shadow-lg shadow-[#C9A84C]/25 ring-2 ring-[#E8CC7A]"
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#C9A84C] text-[#050E21] shadow-lg shadow-[#C9A84C]/25 ring-2 ring-[#E8CC7A]"
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
                    className={`text-[10px] font-bold ${
                      isSelected ? "text-[#050E21]/90" : "text-emerald-400"
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

      {/* 2. Global Filter Toolbar & Subnav */}
      <div className="p-3 sm:p-4 rounded-xl border border-white/10 bg-[#07142A]/80 backdrop-blur flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Filter size={12} /> Filter:
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
              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
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
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <BarChart2 size={13} />
            <span>Interactive Graphs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("heatmap")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "heatmap"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Flame size={13} />
            <span>Area Heatmap</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("areas")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "areas"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <MapPin size={13} />
            <span>Area Matrix ({areaMetrics.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "staff"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Trophy size={13} />
            <span>Staff Arena ({staffMetrics.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cohorts")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "cohorts"
                ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Calendar size={13} />
            <span>YoY Cohorts</span>
          </button>
        </div>
      </div>

      {/* 3. Executive Decision KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Leads */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#07142A] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-sky-500/10 transition-all" />
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Total Leads</span>
            <Layers size={15} className="text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary.totalLeads.toLocaleString()}
            </div>
            <div className="text-[11px] text-sky-300/80 mt-0.5 font-medium">
              {currentYear === "all" ? "All cohorts combined" : `${currentYear} registration cohort`}
            </div>
          </div>
        </div>

        {/* Booked Leads */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-[#07142A] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Booked Leads</span>
            <CheckCircle2 size={15} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-300 tracking-tight flex items-baseline gap-1.5">
              <span>{summary.totalBooked.toLocaleString()}</span>
              <span className="text-xs font-semibold text-emerald-400/80">({summary.conversionRate}%)</span>
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-0.5 font-medium">
              Booking Conversion Velocity
            </div>
          </div>
        </div>

        {/* Active Follow-ups */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-[#07142A] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>Follow-Up Pipeline</span>
            <Clock size={15} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-300 tracking-tight">
              {summary.totalFollowUp.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-0.5 font-medium">Warm prospects calling</div>
          </div>
        </div>

        {/* Call Not Responded */}
        <div className="p-4 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/10 to-[#07142A] shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-purple-400 text-xs font-semibold">
            <span>Not Responded</span>
            <PhoneCall size={15} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-300 tracking-tight">
              {summary.totalNotResponded.toLocaleString()}
            </div>
            <div className="text-[11px] text-purple-300/80 mt-0.5">Ready for auto-recycle</div>
          </div>
        </div>

        {/* Top Area */}
        <div className="p-4 rounded-xl border border-[#C9A84C]/30 bg-gradient-to-br from-[#C9A84C]/10 to-[#07142A] shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#E8CC7A] text-xs font-bold">
            <span>Top Locality</span>
            <MapPin size={15} />
          </div>
          <div className="mt-2 truncate">
            <div className="text-base sm:text-lg font-bold text-white truncate" title={summary.topArea?.name}>
              {summary.topArea?.name || "N/A"}
            </div>
            <div className="text-[11px] text-[#E8CC7A] mt-0.5 font-bold">
              {summary.topArea ? `${summary.topArea.booked} booked (${summary.topArea.conversionRate}%)` : "0"}
            </div>
          </div>
        </div>

        {/* Top Staff */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#07142A] shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Top Telecaller</span>
            <Award size={15} className="text-[#C9A84C]" />
          </div>
          <div className="mt-2 truncate">
            <div className="text-base sm:text-lg font-bold text-white truncate" title={summary.topStaff?.name}>
              {summary.topStaff?.name || "N/A"}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-bold">
              {summary.topStaff ? `${summary.topStaff.booked} booked (${summary.topStaff.conversionRate}%)` : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN TAB CONTENT */}

      {/* TAB 1: INTERACTIVE GRAPHS & COCKPIT */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* TOP SECTION: Donut Funnel + Top Areas Visual Pillars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Glowing Lead Status Funnel (SVG Ring) */}
            <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <PieIcon size={16} className="text-[#C9A84C]" />
                    Lead Conversion Funnel
                  </h3>
                  <span className="text-[11px] text-white/40 font-semibold">Status Mix</span>
                </div>

                {/* SVG Donut */}
                <div className="relative flex items-center justify-center my-4">
                  <svg width="180" height="180" viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke="#0B1E3D"
                      strokeWidth="11"
                    />
                    {statusDonutSegments.map((seg) => (
                      <circle
                        key={seg.id}
                        cx="50"
                        cy="50"
                        r="42"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={hoveredStatus === seg.id ? "14" : "11"}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredStatus(seg.id)}
                        onMouseLeave={() => setHoveredStatus(null)}
                      />
                    ))}
                  </svg>

                  {/* Centered KPI */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-black text-white tracking-tight">
                      {hoveredStatus
                        ? statusDonutSegments.find((s) => s.id === hoveredStatus)?.count.toLocaleString()
                        : `${summary.conversionRate}%`}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                      {hoveredStatus
                        ? statusDonutSegments.find((s) => s.id === hoveredStatus)?.label
                        : "Conversion"}
                    </span>
                  </div>
                </div>

                {/* Segment Legends */}
                <div className="space-y-1.5 mt-4">
                  {statusDonutSegments.map((seg) => (
                    <div
                      key={seg.id}
                      onMouseEnter={() => setHoveredStatus(seg.id)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                        hoveredStatus === seg.id ? "bg-white/10 font-bold" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-white/80">{seg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{seg.count.toLocaleString()}</span>
                        <span className="text-white/40 text-[10px]">({seg.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Top Localities Visual Gradient Pillars */}
            <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart2 size={16} className="text-[#C9A84C]" />
                      Top Localities by Lead Volume & Booked Ratio
                    </h3>
                    <p className="text-xs text-white/60">
                      Comparing lead density with booked conversions across top target zones.
                    </p>
                  </div>
                </div>

                {/* Vertical Visual Pillars */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3 items-end h-56 pt-6 pb-2 border-b border-white/10">
                  {top8ChartAreas.map((a) => {
                    const heightPct = Math.max(15, (a.total / maxAreaTotal) * 100);
                    const isHovered = hoveredArea === a.area;
                    return (
                      <div
                        key={a.area}
                        onMouseEnter={() => setHoveredArea(a.area)}
                        onMouseLeave={() => setHoveredArea(null)}
                        onClick={() => updateParam("area", a.area)}
                        className="flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        {/* Top Booked Badge */}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1.5 transition-all ${
                            a.booked > 0
                              ? "bg-emerald-500 text-[#050E21] font-black shadow-lg shadow-emerald-500/20"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {a.booked}b
                        </span>

                        {/* Gradient Pillar */}
                        <div className="w-full max-w-[36px] bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end p-0.5 relative group-hover:ring-2 group-hover:ring-[#C9A84C] transition-all">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              isHovered
                                ? "bg-gradient-to-t from-sky-600 via-teal-500 to-[#C9A84C]"
                                : "bg-gradient-to-t from-sky-900/80 via-sky-600/70 to-teal-400"
                            }`}
                          />
                        </div>

                        {/* Label */}
                        <span
                          className={`text-[10px] mt-2 truncate w-full text-center font-semibold transition-colors ${
                            isHovered ? "text-[#E8CC7A]" : "text-white/70"
                          }`}
                          title={a.area}
                        >
                          {a.area}
                        </span>
                        <span className="text-[9px] text-white/40 font-mono">{a.total}L</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Legend Footer */}
              <div className="mt-4 flex items-center justify-between text-xs text-white/60 pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Booked leads count shown on top of pillar
                </span>
                <span className="text-[#E8CC7A] font-bold text-[11px]">
                  Click any pillar to filter locality →
                </span>
              </div>
            </div>
          </div>

          {/* AI DECISION INSIGHTS & OPPORTUNITY MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hot Booking Localities */}
            <div className="p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-[#07142A] shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Flame size={16} />
                  </span>
                  <h3 className="text-base font-bold text-white">Hot Booking Zones (High Conversion)</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Focus Territory
                </span>
              </div>
              <p className="text-xs text-white/60">
                These localities demonstrate the highest booking rates. Prioritize direct customer outreach here!
              </p>

              <div className="space-y-2 mt-2">
                {insights.hotZones.map((hz, idx) => (
                  <div
                    key={hz.area}
                    onClick={() => updateParam("area", hz.area)}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{hz.area}</div>
                        <div className="text-[10px] text-white/40">{hz.total} Total Registered Leads</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400 text-xs">{hz.booked} Booked</div>
                      <div className="text-[10px] text-emerald-300/80 font-bold">{hz.conversionRate}% Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Untapped High-Volume Goldmines */}
            <div className="p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-[#07142A] shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Target size={16} />
                  </span>
                  <h3 className="text-base font-bold text-white">Untapped High-Volume Goldmines</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Opportunity
                </span>
              </div>
              <p className="text-xs text-white/60">
                Large pools of uncalled leads with massive upside. Allocating calling campaigns here will maximize revenue!
              </p>

              <div className="space-y-2 mt-2">
                {insights.untapped.map((ut, idx) => (
                  <div
                    key={ut.area}
                    onClick={() => updateParam("area", ut.area)}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{ut.area}</div>
                        <div className="text-[10px] text-amber-300/80 font-semibold">{ut.total} Untapped Leads</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white/70 text-xs">{ut.new + ut.draft} Uncalled</div>
                      <div className="text-[10px] text-amber-400 font-bold">Ready to Allocate →</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE AREA HEATMAP GRID */}
      {activeTab === "heatmap" && (
        <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame size={18} className="text-[#C9A84C]" />
                Area × Year Booking Density Heatmap
              </h3>
              <p className="text-xs text-white/60">
                Visual matrix highlighting booking hotspots across vintages. Dark Emerald represents active conversion zones.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 text-white/50">
                <span className="w-3 h-3 rounded bg-white/5 border border-white/10" /> 0 Booked
              </span>
              <span className="inline-flex items-center gap-1 text-teal-300">
                <span className="w-3 h-3 rounded bg-teal-900/60 border border-teal-500/30" /> 1-2 Booked
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-300" /> 3+ Booked (Hot)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B1E3D] text-white/70 font-semibold border-b border-white/10">
                  <th className="py-3 px-4">Locality / Area</th>
                  <th className="py-3 px-3 text-right">Total Leads</th>
                  <th className="py-3 px-3 text-right text-emerald-400">Total Booked</th>
                  <th className="py-3 px-3 text-right">Conversion %</th>
                  {availableYears.map((yr) => (
                    <th key={yr} className="py-3 px-4 text-center font-bold text-[#E8CC7A] bg-white/[0.02]">
                      {yr} Heatmap
                    </th>
                  ))}
                  <th className="py-3 px-4">Decision Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAreaMetrics.slice(0, 25).map((a) => (
                  <tr key={a.area} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#C9A84C]" />
                      <span>{a.area}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-white/90">{a.total.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-400">{a.booked}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-300">
                        {a.conversionRate}%
                      </span>
                    </td>

                    {/* Year Heatmap Cells */}
                    {availableYears.map((yr) => {
                      const yStat = a.yearBreakdown[yr];
                      const bCount = yStat?.booked ?? 0;
                      const tCount = yStat?.total ?? 0;

                      let cellBg = "bg-white/[0.02] text-white/30 border-white/5";
                      if (bCount >= 3) {
                        cellBg = "bg-emerald-500 text-[#050E21] font-black shadow-md border-emerald-400";
                      } else if (bCount >= 1) {
                        cellBg = "bg-teal-900/50 text-teal-200 font-bold border-teal-500/30";
                      } else if (tCount >= 20) {
                        cellBg = "bg-amber-950/20 text-amber-300/80 border-amber-500/20";
                      }

                      return (
                        <td key={yr} className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              updateParam("area", a.area);
                              updateParam("year", yr);
                            }}
                            className={`w-full py-1.5 rounded-lg border text-xs transition-all cursor-pointer flex flex-col items-center justify-center ${cellBg}`}
                          >
                            <span>{bCount > 0 ? `${bCount} booked` : "0 booked"}</span>
                            <span className="text-[9px] opacity-70 font-mono">({tCount} leads)</span>
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => updateParam("area", a.area)}
                        className="px-2.5 py-1 rounded bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 text-[#E8CC7A] text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Drilldown</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AREA MATRIX */}
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

      {/* TAB 4: STAFF ARENA & PODIUM */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          {/* Staff Performance Podium */}
          <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-[#C9A84C]" />
              Telecaller Performance Podium
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {top3Staff.map((staff, idx) => {
                const rankLabels = ["🥇 Rank #1 Champion", "🥈 Rank #2 Contender", "🥉 Rank #3 Achiever"];
                const borderColors = [
                  "border-[#C9A84C] bg-gradient-to-b from-[#C9A84C]/15 to-[#07142A]",
                  "border-sky-400/40 bg-gradient-to-b from-sky-500/10 to-[#07142A]",
                  "border-amber-700/40 bg-gradient-to-b from-amber-700/10 to-[#07142A]",
                ];

                return (
                  <div
                    key={staff.adminUserId}
                    className={`p-4 rounded-xl border ${borderColors[idx]} space-y-3 relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{rankLabels[idx]}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                        {staff.conversionRate}% Rate
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#C9A84C] text-[#050E21] font-black text-lg flex items-center justify-center shadow-lg">
                        {staff.staffName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{staff.staffName}</div>
                        <div className="text-xs text-white/50">{staff.email}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/10">
                      <div>
                        <span className="text-white/40 block text-[10px] uppercase font-bold">Bookings</span>
                        <span className="text-lg font-black text-emerald-400">{staff.bookedCount} Leads</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px] uppercase font-bold">Follow-Up</span>
                        <span className="text-lg font-black text-amber-400">{staff.followUpCount} Active</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Staff List Accordion */}
          <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Users size={16} className="text-[#C9A84C]" />
              Detailed Staff Area & Cohort Attribution
            </h3>

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

      {/* TAB 5: YOY COHORTS */}
      {activeTab === "cohorts" && (
        <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#07142A] shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-[#C9A84C]" />
              Year-over-Year Cohort Deep Dive
            </h3>
            <p className="text-xs text-white/60">
              Deep dive into lead vintage performance comparing 2024, 2025, and 2026 batches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {yearCohorts.map((yc) => (
              <div
                key={yc.year}
                className="p-5 rounded-xl border border-white/10 bg-gradient-to-b from-[#0B1E3D] to-[#07142A] space-y-4 shadow-lg hover:border-[#C9A84C]/50 transition-all"
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
                  className="w-full py-2 rounded-xl bg-[#C9A84C] text-[#050E21] font-bold text-xs hover:bg-[#E8CC7A] transition-colors shadow-sm cursor-pointer"
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
