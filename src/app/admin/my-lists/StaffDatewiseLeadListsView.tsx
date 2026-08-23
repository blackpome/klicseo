"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  UploadCloud,
  Zap,
} from "lucide-react";
import type { LeadListRow } from "@/lib/leadLists-shared";
import DeleteLeadListButton from "../lists/DeleteLeadListButton";
import RecycleLeadsModal from "../lists/RecycleLeadsModal";

interface Props {
  lists: LeadListRow[];
  currentUser: { id: string; email: string; name: string; role: string };
  isSuperAdmin: boolean;
  adminUsers?: { id: string; email: string; name: string }[];
}

interface DateGroup {
  dateKey: string; // "YYYY-MM-DD"
  displayDate: string; // "Today · 23 Aug 2026"
  isToday: boolean;
  isYesterday: boolean;
  lists: LeadListRow[];
  totalLeads: number;
  completedLeads: number;
  pendingLeads: number;
  completionRate: number;
}

interface StaffGroup {
  staffId: string;
  staffName: string;
  staffEmail: string;
  totalLists: number;
  totalLeads: number;
  completedLeads: number;
  pendingLeads: number;
  completionRate: number;
  dateGroups: DateGroup[];
}

export default function StaffDatewiseLeadListsView({
  lists,
  currentUser,
  isSuperAdmin,
  adminUsers = [],
}: Props) {
  const router = useRouter();

  // If super-admin: start at Level 1 (List of Staffs = null)
  // If telecaller: start at Level 2 (their own staffId)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    isSuperAdmin ? null : currentUser.id,
  );

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Recycle modal state
  const [recycleModalConfig, setRecycleModalConfig] = useState<{
    isOpen: boolean;
    sourceListId?: string;
    sourceListName?: string;
    sourceAdminUserId?: string;
  }>({ isOpen: false });

  // 1. Group lists by Staff -> Datewise -> Batch Leads
  const { staffList, globalStats } = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const staffMap = new Map<string, { name: string; email: string; lists: LeadListRow[] }>();

    // Include all known admin staff members even if they currently have 0 lists
    for (const u of adminUsers) {
      if (u?.id) {
        staffMap.set(u.id, { name: u.name || u.email || "Staff Member", email: u.email || "", lists: [] });
      }
    }

    // Always include current user if valid id
    if (currentUser?.id && currentUser.id !== "super_admin" && !staffMap.has(currentUser.id)) {
      staffMap.set(currentUser.id, {
        name: currentUser.name || currentUser.email || "Staff Member",
        email: currentUser.email || "",
        lists: [],
      });
    }

    // Unassigned container
    const unassignedLists: LeadListRow[] = [];

    for (const list of lists) {
      if (list.assigned_admin_user_id) {
        const staff = staffMap.get(list.assigned_admin_user_id) ?? {
          name: list.assigned_admin_user?.name || "Staff Member",
          email: list.assigned_admin_user?.email || "",
          lists: [],
        };
        staff.lists.push(list);
        staffMap.set(list.assigned_admin_user_id, staff);
      } else {
        unassignedLists.push(list);
      }
    }

    const helperBuildDateGroups = (rawLists: LeadListRow[]): DateGroup[] => {
      const datesMap = new Map<string, LeadListRow[]>();

      for (const l of rawLists) {
        const d = new Date(l.created_at);
        const dateKey = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const existing = datesMap.get(dateKey) ?? [];
        existing.push(l);
        datesMap.set(dateKey, existing);
      }

      const sortedDateKeys = Array.from(datesMap.keys()).sort((a, b) => b.localeCompare(a));

      return sortedDateKeys.map((dateKey) => {
        const dateLists = datesMap.get(dateKey) ?? [];
        const isToday = dateKey === todayStr;
        const isYesterday = dateKey === yesterdayStr;

        let displayDate = new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          weekday: "short",
          timeZone: "Asia/Kolkata",
        });

        if (isToday) displayDate = `Today · ${displayDate}`;
        else if (isYesterday) displayDate = `Yesterday · ${displayDate}`;

        const totalLeads = dateLists.reduce((sum, l) => sum + (l.lead_count ?? 0), 0);
        const completedLeads = dateLists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
        const pendingLeads = dateLists.reduce((sum, l) => sum + (l.pending_count ?? 0), 0);
        const completionRate =
          totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

        return {
          dateKey,
          displayDate,
          isToday,
          isYesterday,
          lists: dateLists,
          totalLeads,
          completedLeads,
          pendingLeads,
          completionRate,
        };
      });
    };

    const seenStaffIds = new Set<string>();
    const builtStaffList: StaffGroup[] = [];

    for (const [sId, sData] of staffMap.entries()) {
      if (!sId || seenStaffIds.has(sId)) continue;
      seenStaffIds.add(sId);

      const dateGroups = helperBuildDateGroups(sData.lists);
      const totalLists = sData.lists.length;
      const totalLeads = sData.lists.reduce((sum, l) => sum + (l.lead_count ?? 0), 0);
      const completedLeads = sData.lists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
      const pendingLeads = sData.lists.reduce((sum, l) => sum + (l.pending_count ?? 0), 0);
      const completionRate =
        totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

      builtStaffList.push({
        staffId: sId,
        staffName: sData.name,
        staffEmail: sData.email,
        totalLists,
        totalLeads,
        completedLeads,
        pendingLeads,
        completionRate,
        dateGroups,
      });
    }

    // Add unassigned if any
    if (unassignedLists.length > 0 && !seenStaffIds.has("unassigned")) {
      seenStaffIds.add("unassigned");
      const dateGroups = helperBuildDateGroups(unassignedLists);
      const totalLeads = unassignedLists.reduce((sum, l) => sum + (l.lead_count ?? 0), 0);
      const completedLeads = unassignedLists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
      const pendingLeads = unassignedLists.reduce((sum, l) => sum + (l.pending_count ?? 0), 0);
      const completionRate =
        totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

      builtStaffList.push({
        staffId: "unassigned",
        staffName: "Unassigned Lists",
        staffEmail: "Lists not assigned to any staff",
        totalLists: unassignedLists.length,
        totalLeads,
        completedLeads,
        pendingLeads,
        completionRate,
        dateGroups,
      });
    }

    // Sort staff: ones with active lists/pending leads first
    builtStaffList.sort((a, b) => {
      if (a.staffId === "unassigned") return 1;
      if (b.staffId === "unassigned") return -1;
      if (b.totalLists !== a.totalLists) return b.totalLists - a.totalLists;
      return b.pendingLeads - a.pendingLeads;
    });

    const globalTotalLeads = lists.reduce((sum, l) => sum + (l.lead_count ?? 0), 0);
    const globalCompleted = lists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
    const globalPending = lists.reduce((sum, l) => sum + (l.pending_count ?? 0), 0);
    const globalRate =
      globalTotalLeads > 0 ? Math.round((globalCompleted / globalTotalLeads) * 100) : 0;

    return {
      staffList: builtStaffList,
      globalStats: {
        totalLists: lists.length,
        totalLeads: globalTotalLeads,
        completedLeads: globalCompleted,
        pendingLeads: globalPending,
        completionRate: globalRate,
      },
    };
  }, [lists, adminUsers, currentUser]);

  const selectedStaffObj = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffList.find((s) => s.staffId === selectedStaffId) ?? null;
  }, [selectedStaffId, staffList]);

  // Filter date groups for the selected staff
  const activeDateGroups = useMemo(() => {
    if (!selectedStaffObj) return [];

    const q = searchQuery.toLowerCase().trim();

    return selectedStaffObj.dateGroups
      .map((group) => {
        const filteredLists = group.lists.filter((list) => {
          // Status filter
          if (statusFilter === "active" && (list.pending_count ?? 0) === 0) return false;
          if (statusFilter === "completed" && (list.pending_count ?? 0) > 0) return false;

          // Search query
          if (q && !list.name.toLowerCase().includes(q)) return false;

          return true;
        });

        if (filteredLists.length === 0) return null;

        const totalLeads = filteredLists.reduce((sum, l) => sum + (l.lead_count ?? 0), 0);
        const completedLeads = filteredLists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
        const pendingLeads = filteredLists.reduce((sum, l) => sum + (l.pending_count ?? 0), 0);
        const completionRate =
          totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

        return {
          ...group,
          lists: filteredLists,
          totalLeads,
          completedLeads,
          pendingLeads,
          completionRate,
        };
      })
      .filter((g): g is DateGroup => g !== null);
  }, [selectedStaffObj, statusFilter, searchQuery]);

  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* LEVEL 1: LIST OF STAFFS (When no specific staff is selected) */}
      {selectedStaffId === null ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">
                <span>Lead Lists</span>
                <span>→</span>
                <span>List of Staffs</span>
              </div>
              <h1
                className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Staff Calling Lists
              </h1>
              <p className="text-xs text-white/50 mt-0.5">
                Select a staff member below to view their datewise assigned lead batches
              </p>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
                <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Total Staff
                </span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {staffList.length}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
                <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Pending Calls
                </span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {globalStats.pendingLeads}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
                <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Overall Progress
                </span>
                <span className="text-sm font-bold text-sky-400 tabular-nums">
                  {globalStats.completionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* STAFF CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((staff, idx) => {
              const initial = staff.staffName.charAt(0).toUpperCase();

              return (
                <div
                  key={`staff-${staff.staffId || idx}`}
                  onClick={() => setSelectedStaffId(staff.staffId)}
                  className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-[#071228] p-5 space-y-4 hover:border-[#C9A84C]/50 hover:bg-white/[0.02] transition-all shadow-lg flex flex-col justify-between"
                >
                  {/* Staff Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#E8CC7A]/10 border border-[#C9A84C]/30 text-[#E8CC7A] font-bold text-base shadow-sm">
                        {initial}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-[#E8CC7A] transition-colors">
                          {staff.staffName}
                        </h3>
                        <p className="text-xs text-white/40 truncate max-w-[180px]">
                          {staff.staffEmail}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-white/70 tabular-nums">
                      {staff.totalLists} {staff.totalLists === 1 ? "batch" : "batches"}
                    </span>
                  </div>

                  {/* Metrics & Calling Queue */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-[#050E21] border border-white/[0.04]">
                        <span className="block text-[9px] uppercase font-bold tracking-wider text-white/35">
                          Total Leads
                        </span>
                        <span className="text-xs font-bold text-white tabular-nums">
                          {staff.totalLeads}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-[#050E21] border border-white/[0.04]">
                        <span className="block text-[9px] uppercase font-bold tracking-wider text-white/35">
                          Pending
                        </span>
                        <span className="text-xs font-bold text-amber-400 tabular-nums">
                          {staff.pendingLeads}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-[#050E21] border border-white/[0.04]">
                        <span className="block text-[9px] uppercase font-bold tracking-wider text-white/35">
                          Completed
                        </span>
                        <span className="text-xs font-bold text-emerald-400 tabular-nums">
                          {staff.completedLeads}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-white/40">
                        <span>Calling Progress</span>
                        <span className="font-semibold text-white/70">{staff.completionRate}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#C9A84C] to-emerald-400 rounded-full"
                          style={{ width: `${staff.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <div className="pt-2">
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 rounded-xl bg-white/5 group-hover:bg-[#C9A84C] group-hover:text-[#050E21] text-white/80 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 border border-white/10 group-hover:border-[#C9A84C]"
                    >
                      <span>View Datewise Lists</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LEVEL 2: DATEWISE ASSIGNED LEAD LISTS FOR SELECTED STAFF */
        <div className="space-y-6">
          {/* Header with Back Button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">
                {isSuperAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffId(null)}
                      className="hover:underline flex items-center gap-1"
                    >
                      <ArrowLeft size={11} /> List of Staffs
                    </button>
                    <span>→</span>
                  </>
                )}
                <span>{selectedStaffObj?.staffName}</span>
                <span>→</span>
                <span>Datewise Assigned Lists</span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setSelectedStaffId(null)}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors shrink-0"
                    title="Back to List of Staffs"
                  >
                    <ArrowLeft size={15} />
                  </button>
                )}

                <h1
                  className="text-2xl md:text-3xl font-bold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {selectedStaffObj?.staffName}&apos;s Assigned Lead Lists
                </h1>
              </div>

              <p className="text-xs text-white/50 mt-0.5">
                Organized datewise by campaign distribution dates ({selectedStaffObj?.totalLists || 0} batches total)
              </p>
            </div>

            {/* Selected Staff Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
                <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Pending Calls
                </span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {selectedStaffObj?.pendingLeads || 0}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
                <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Completed
                </span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                  {selectedStaffObj?.completedLeads || 0}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
                <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Progress
                </span>
                <span className="text-sm font-bold text-sky-400 tabular-nums">
                  {selectedStaffObj?.completionRate || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-[#071228] border border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === "all"
                    ? "bg-white/15 text-white font-bold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                All Batches
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === "active"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Active Calls Pending</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === "completed"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                Completed
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
          </div>

          {/* DATEWISE GROUPS & BATCH LEADS */}
          {activeDateGroups.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#071228] p-12 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/30">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white">No lead batches match this criteria</h3>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                {searchQuery
                  ? `No campaign batches found matching "${searchQuery}".`
                  : "No lead lists assigned for this filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeDateGroups.map((dateGroup, dIdx) => {
                const isCollapsed = collapsedDates.has(dateGroup.dateKey);

                return (
                  <div
                    key={`date-group-${dateGroup.dateKey || dIdx}`}
                    className={`rounded-3xl border transition-all ${
                      dateGroup.isToday
                        ? "border-[#C9A84C]/40 bg-[#071228]/95 shadow-xl shadow-[#C9A84C]/5"
                        : "border-white/[0.08] bg-[#071228]/80"
                    }`}
                  >
                    {/* DATE HEADER */}
                    <div
                      onClick={() => toggleDateCollapse(dateGroup.dateKey)}
                      className="flex items-center justify-between p-4 md:p-5 cursor-pointer select-none hover:bg-white/[0.02] rounded-t-3xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-2xl ${
                            dateGroup.isToday
                              ? "bg-[#C9A84C] text-[#050E21] font-bold shadow-md shadow-[#C9A84C]/20"
                              : "bg-white/5 text-white/60"
                          }`}
                        >
                          <Calendar size={18} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-white">
                              {dateGroup.displayDate}
                            </h3>
                            {dateGroup.isToday && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#E8CC7A] border border-[#C9A84C]/40">
                                Today&apos;s Release
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/45 mt-0.5">
                            {dateGroup.lists.length} Batch
                            {dateGroup.lists.length === 1 ? "" : "es"} · {dateGroup.totalLeads} Leads Total
                          </p>
                        </div>
                      </div>

                      {/* Date Summary Stats */}
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3 text-right">
                          <div>
                            <span className="block text-xs font-bold text-amber-400 tabular-nums">
                              {dateGroup.pendingLeads} Pending Calls
                            </span>
                            <span className="block text-[11px] text-white/40 tabular-nums">
                              {dateGroup.completedLeads} Completed ({dateGroup.completionRate}%)
                            </span>
                          </div>

                          <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#C9A84C] to-emerald-400 rounded-full"
                              style={{ width: `${dateGroup.completionRate}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-white/60 hover:text-white"
                        >
                          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* WHAT HAPPENED ON THIS DATE BRIEFING BANNER */}
                    {!isCollapsed && (() => {
                      const bookedOnDate = dateGroup.lists.reduce((sum, l) => sum + (l.status_counts?.booked ?? 0), 0);
                      const followUpOnDate = dateGroup.lists.reduce((sum, l) => sum + (l.status_counts?.follow_up ?? 0), 0);
                      const contactedOnDate = dateGroup.lists.reduce((sum, l) => sum + (l.status_counts?.contacted ?? 0), 0);
                      const noAnswerOnDate = dateGroup.lists.reduce((sum, l) => sum + (l.status_counts?.call_not_responded ?? 0), 0);
                      const callsOnDate = dateGroup.completedLeads;
                      const staffName = selectedStaffObj?.staffName || "Staff member";

                      return (
                        <div className="p-4 md:p-5 pt-0 space-y-4">
                          <div className="rounded-2xl border border-white/[0.06] bg-[#050E21] p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C9A84C]">
                                <Sparkles size={14} /> What Happened On {dateGroup.displayDate.replace("Today · ", "").replace("Yesterday · ", "")}
                              </span>
                              <span className="text-[11px] text-white/40 font-medium">
                                {dateGroup.completionRate}% daily calling coverage
                              </span>
                            </div>

                            {/* Dynamic Daily Story */}
                            <p className="text-xs text-white/80 leading-relaxed font-medium">
                              {bookedOnDate > 0
                                ? `🏆 Outstanding outcome! ${staffName} converted ${bookedOnDate} confirmed booking${bookedOnDate === 1 ? "" : "s"} with ${callsOnDate} calls completed (${dateGroup.completionRate}% coverage).`
                                : callsOnDate > 0
                                ? `📞 ${staffName} completed ${callsOnDate} out of ${dateGroup.totalLeads} calls (${dateGroup.completionRate}% coverage) with ${followUpOnDate} callback${followUpOnDate === 1 ? "" : "s"} scheduled.`
                                : `⚡ ${dateGroup.totalLeads} fresh leads released across ${dateGroup.lists.length} batch${dateGroup.lists.length === 1 ? "" : "es"} awaiting outreach.`}
                            </p>

                            {/* Daily Metric Highlights Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                                <span className="block text-[9px] uppercase font-bold tracking-wider text-white/35">
                                  Total Assigned
                                </span>
                                <span className="text-xs font-bold text-white tabular-nums">
                                  {dateGroup.totalLeads} Leads
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                                <span className="block text-[9px] uppercase font-bold tracking-wider text-white/35">
                                  Calls Made
                                </span>
                                <span className="text-xs font-bold text-sky-400 tabular-nums">
                                  {callsOnDate} ({dateGroup.completionRate}%)
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <span className="block text-[9px] uppercase font-bold tracking-wider text-emerald-300">
                                  🏆 Booked
                                </span>
                                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                                  {bookedOnDate} Converted
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                <span className="block text-[9px] uppercase font-bold tracking-wider text-amber-300">
                                  🟡 Callbacks
                                </span>
                                <span className="text-xs font-bold text-amber-400 tabular-nums">
                                  {followUpOnDate} Scheduled
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                                <span className="block text-[9px] uppercase font-bold tracking-wider text-rose-300">
                                  📵 Unreachable
                                </span>
                                <span className="text-xs font-bold text-rose-400 tabular-nums">
                                  {noAnswerOnDate} No Answer
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                                <span className="block text-[9px] uppercase font-bold tracking-wider text-purple-300">
                                  🟢 To Call
                                </span>
                                <span className="text-xs font-bold text-purple-300 tabular-nums">
                                  {dateGroup.pendingLeads} Pending
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* BATCH LEADS GRID */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {dateGroup.lists.map((batch, bIdx) => {
                          const count = batch.lead_count ?? 0;
                          const completed = batch.completed_count ?? 0;
                          const pending = batch.pending_count ?? 0;
                          const rate = batch.completion_rate ?? 0;
                          const statusCounts = batch.status_counts ?? {};

                          return (
                            <div
                              key={`batch-card-${batch.id || bIdx}`}
                              className="group rounded-2xl border border-white/[0.08] bg-[#050E21] p-5 space-y-4 hover:border-[#C9A84C]/40 hover:bg-white/[0.01] transition-all shadow-lg flex flex-col justify-between"
                            >
                              {/* Batch Header */}
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <Link
                                    href={`/admin/lists/${batch.id}`}
                                    className="text-base font-bold text-white group-hover:text-[#E8CC7A] transition-colors block line-clamp-2"
                                  >
                                    {batch.name}
                                  </Link>

                                  {isSuperAdmin && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Link
                                        href={`/admin/lists/${batch.id}/edit`}
                                        title="Edit List"
                                        className="grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                      >
                                        <Pencil size={13} />
                                      </Link>
                                      <DeleteLeadListButton id={batch.id} name={batch.name} />
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-white/40">
                                  <span>Created by {batch.admin_users?.email || "Admin"}</span>
                                  <span className="text-[11px] text-white/35 tabular-nums">
                                    {new Date(batch.created_at).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                      timeZone: "Asia/Kolkata",
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Status Pills Breakdown */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {statusCounts.new != null && statusCounts.new > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 font-medium">
                                    🟢 {statusCounts.new} New
                                  </span>
                                )}
                                {statusCounts.follow_up != null && statusCounts.follow_up > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                                    🟡 {statusCounts.follow_up} Follow-up
                                  </span>
                                )}
                                {statusCounts.contacted != null && statusCounts.contacted > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium">
                                    🔵 {statusCounts.contacted} Contacted
                                  </span>
                                )}
                                {statusCounts.booked != null && statusCounts.booked > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium">
                                    🏆 {statusCounts.booked} Booked
                                  </span>
                                )}
                                {statusCounts.call_not_responded != null &&
                                  statusCounts.call_not_responded > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
                                      📵 {statusCounts.call_not_responded} No Answer
                                    </span>
                                  )}
                              </div>

                              {/* Progress & Calling CTA */}
                              <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/40">
                                      {pending > 0 ? `${pending} leads pending` : "All leads called"}
                                    </span>
                                    <span className="font-bold text-white tabular-nums">
                                      {completed} / {count} ({rate}%)
                                    </span>
                                  </div>

                                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        rate === 100
                                          ? "bg-emerald-400"
                                          : "bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A]"
                                      }`}
                                      style={{ width: `${rate}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <Link
                                    href={`/admin/lists/${batch.id}`}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#C9A84C]/15"
                                  >
                                    <PhoneCall size={13} />
                                    <span>
                                      {pending > 0 ? `Start Calling (${pending})` : "View Leads Batch"}
                                    </span>
                                  </Link>

                                  {isSuperAdmin && (
                                    <button
                                      type="button"
                                      title="Recycle Remaining Leads"
                                      onClick={() =>
                                        setRecycleModalConfig({
                                          isOpen: true,
                                          sourceListId: batch.id,
                                          sourceListName: batch.name,
                                        })
                                      }
                                      className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors shrink-0"
                                    >
                                      <RotateCcw size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
            </div>
          )}
        </div>
      )}

      {/* Recycle Modal */}
      {recycleModalConfig.isOpen && (
        <RecycleLeadsModal
          isOpen={recycleModalConfig.isOpen}
          onClose={() => setRecycleModalConfig({ isOpen: false })}
          sourceListId={recycleModalConfig.sourceListId}
          sourceListName={recycleModalConfig.sourceListName}
          sourceAdminUserId={recycleModalConfig.sourceAdminUserId}
          adminUsers={adminUsers}
          onSuccess={(msg) => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
