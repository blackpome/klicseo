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
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
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
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    isSuperAdmin ? "all" : currentUser.id,
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
  const { staffList, allDateGroups, globalStats } = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const staffMap = new Map<string, { name: string; email: string; lists: LeadListRow[] }>();

    // Include all known admin staff members even if they have 0 lists
    for (const u of adminUsers) {
      staffMap.set(u.id, { name: u.name, email: u.email, lists: [] });
    }

    // Always include current user
    if (!staffMap.has(currentUser.id)) {
      staffMap.set(currentUser.id, {
        name: currentUser.name,
        email: currentUser.email,
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

    const builtStaffList: StaffGroup[] = [];

    for (const [sId, sData] of staffMap.entries()) {
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
    if (unassignedLists.length > 0) {
      const dateGroups = helperBuildDateGroups(unassignedLists);
      const totalLeads = unassignedLists.reduce((sum, l) => sum + (l.lead_count ?? 0), 0);
      const completedLeads = unassignedLists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
      const pendingLeads = unassignedLists.reduce((sum, l) => sum + (l.pending_count ?? 0), 0);
      const completionRate =
        totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

      builtStaffList.push({
        staffId: "unassigned",
        staffName: "Unassigned Lists",
        staffEmail: "",
        totalLists: unassignedLists.length,
        totalLeads,
        completedLeads,
        pendingLeads,
        completionRate,
        dateGroups,
      });
    }

    const allDateGroupsBuilt = helperBuildDateGroups(lists);
    const globalTotalLeads = lists.reduce((sum, l) => sum + (l.lead_count ?? 0), 0);
    const globalCompleted = lists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
    const globalPending = lists.reduce((sum, l) => sum + (l.pending_count ?? 0), 0);
    const globalRate =
      globalTotalLeads > 0 ? Math.round((globalCompleted / globalTotalLeads) * 100) : 0;

    return {
      staffList: builtStaffList,
      allDateGroups: allDateGroupsBuilt,
      globalStats: {
        totalLists: lists.length,
        totalLeads: globalTotalLeads,
        completedLeads: globalCompleted,
        pendingLeads: globalPending,
        completionRate: globalRate,
      },
    };
  }, [lists, adminUsers, currentUser]);

  // 2. Filter active date groups based on staff selection, search, and status filter
  const activeDateGroups = useMemo(() => {
    let sourceGroups: DateGroup[] = [];

    if (selectedStaffId === "all") {
      sourceGroups = allDateGroups;
    } else {
      const foundStaff = staffList.find((s) => s.staffId === selectedStaffId);
      sourceGroups = foundStaff ? foundStaff.dateGroups : [];
    }

    const q = searchQuery.toLowerCase().trim();

    return sourceGroups
      .map((group) => {
        const filteredLists = group.lists.filter((list) => {
          // Status filter
          if (statusFilter === "active" && (list.pending_count ?? 0) === 0) return false;
          if (statusFilter === "completed" && (list.pending_count ?? 0) > 0) return false;

          // Search query
          if (q) {
            const nameMatch = list.name.toLowerCase().includes(q);
            const staffMatch = (list.assigned_admin_user?.name || "").toLowerCase().includes(q);
            if (!nameMatch && !staffMatch) return false;
          }

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
  }, [selectedStaffId, allDateGroups, staffList, statusFilter, searchQuery]);

  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const selectedStaffObj = useMemo(() => {
    if (selectedStaffId === "all") return null;
    return staffList.find((s) => s.staffId === selectedStaffId) ?? null;
  }, [selectedStaffId, staffList]);

  return (
    <div className="space-y-6">
      {/* Header & Hierarchy Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">
            <span>My Lists</span>
            <span>→</span>
            <span>Staff</span>
            <span>→</span>
            <span>Datewise</span>
            <span>→</span>
            <span>Batch Leads</span>
          </div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {selectedStaffObj
              ? `Campaign Worklists · ${selectedStaffObj.staffName}`
              : "Lead Campaigns & Calling Worklists"}
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Organized chronologically by release dates and caller batch allocations
          </p>
        </div>

        {/* Global Summary Cards */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
            <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
              Pending Calls
            </span>
            <span className="text-sm font-bold text-amber-400 tabular-nums">
              {selectedStaffObj
                ? selectedStaffObj.pendingLeads
                : globalStats.pendingLeads}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
            <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
              Completed
            </span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              {selectedStaffObj
                ? selectedStaffObj.completedLeads
                : globalStats.completedLeads}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#071228] border border-white/[0.08] text-center">
            <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
              Progress
            </span>
            <span className="text-sm font-bold text-sky-400 tabular-nums">
              {selectedStaffObj
                ? selectedStaffObj.completionRate
                : globalStats.completionRate}
              %
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: STAFF SELECTOR TABS (for Super-Admins or Team view) */}
      {isSuperAdmin && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              1. Select Staff Member
            </span>
            <span className="text-[11px] text-white/30">
              {staffList.length} staff members registered
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedStaffId("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                selectedStaffId === "all"
                  ? "bg-[#C9A84C] text-[#050E21] border-[#C9A84C] font-bold shadow-md shadow-[#C9A84C]/15"
                  : "bg-[#071228] text-white/70 border-white/[0.08] hover:border-white/20 hover:text-white"
              }`}
            >
              <Users size={14} />
              <span>All Staff</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                  selectedStaffId === "all" ? "bg-black/20" : "bg-white/10"
                }`}
              >
                {globalStats.totalLists}
              </span>
            </button>

            {staffList.map((staff) => {
              const isSelected = selectedStaffId === staff.staffId;
              return (
                <button
                  key={staff.staffId}
                  type="button"
                  onClick={() => setSelectedStaffId(staff.staffId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                    isSelected
                      ? "bg-[#C9A84C] text-[#050E21] border-[#C9A84C] font-bold shadow-md shadow-[#C9A84C]/15"
                      : "bg-[#071228] text-white/70 border-white/[0.08] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <User size={13} />
                  <span>{staff.staffName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                      isSelected ? "bg-black/20" : "bg-white/10"
                    }`}
                  >
                    {staff.totalLists}
                  </span>
                  {staff.pendingLeads > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected
                          ? "bg-black/30 text-[#050E21]"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {staff.pendingLeads} to call
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-[#071228] border border-white/[0.08]">
        {/* Status Filter Tabs */}
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
            Completed Batches
          </button>
        </div>

        {/* Real-time search */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batches by name..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
      </div>

      {/* STEP 2 & 3: DATEWISE GROUPS & BATCH LEADS */}
      {activeDateGroups.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#071228] p-12 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/30">
            <ClipboardList size={24} />
          </div>
          <h3 className="text-sm font-semibold text-white">No lead batches match this criteria</h3>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            {searchQuery
              ? `No campaign batches found matching "${searchQuery}".`
              : "No lead lists or calling batches assigned for this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeDateGroups.map((dateGroup) => {
            const isCollapsed = collapsedDates.has(dateGroup.dateKey);

            return (
              <div
                key={dateGroup.dateKey}
                className={`rounded-3xl border transition-all ${
                  dateGroup.isToday
                    ? "border-[#C9A84C]/40 bg-[#071228]/95 shadow-xl shadow-[#C9A84C]/5"
                    : "border-white/[0.08] bg-[#071228]/80"
                }`}
              >
                {/* DATEWISE ACCORDION HEADER */}
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

                  {/* Date Progress & Action */}
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

                      {/* Mini visual progress bar */}
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

                {/* BATCH LEADS GRID */}
                {!isCollapsed && (
                  <div className="p-4 md:p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/[0.04]">
                    {dateGroup.lists.map((batch) => {
                      const count = batch.lead_count ?? 0;
                      const completed = batch.completed_count ?? 0;
                      const pending = batch.pending_count ?? 0;
                      const rate = batch.completion_rate ?? 0;
                      const assigneeName = batch.assigned_admin_user?.name;
                      const statusCounts = batch.status_counts ?? {};

                      return (
                        <div
                          key={batch.id}
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

                            {/* Assigned Staff Badge */}
                            <div className="flex items-center justify-between text-xs text-white/50">
                              <div className="flex items-center gap-1.5">
                                <User size={12} className="text-[#C9A84C]" />
                                <span className="font-medium text-white/80">
                                  {assigneeName || "Unassigned"}
                                </span>
                              </div>

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

                              {/* Quick Recycle Action for non-booked leads */}
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
                )}
              </div>
            );
          })}
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
        />
      )}
    </div>
  );
}
