"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  Layers,
  Folder,
} from "lucide-react";
import type { AreaCountSummary } from "@/lib/area";
import FolderAllocationButton from "./FolderAllocationButton";
import type { LeadListRow } from "@/lib/leadLists-shared";

interface Props {
  folderId?: string; // e.g. "website_form", "hot_leads", "year_2026"
  folderTitle?: string;
  folderBadge?: string;
  folderDescription?: string;
  // Legacy / fallback props
  yearFolder?: string;
  yearLabel?: string;
  areaSummaries: AreaCountSummary[];
  totalLeads?: number;
  totalBooked?: number;
  totalYearLeads?: number;
  totalYearBooked?: number;
  adminUsers?: { id: string; email: string; name: string }[];
  leadLists?: LeadListRow[];
  canManage?: boolean;
}

export default function YearAreaFoldersView({
  folderId,
  folderTitle,
  folderBadge,
  folderDescription,
  yearFolder,
  yearLabel,
  areaSummaries,
  totalLeads,
  totalBooked,
  totalYearLeads,
  totalYearBooked,
  adminUsers = [],
  leadLists = [],
  canManage = true,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const activeFolderId = folderId || yearFolder || "year_2026";
  const activeTitle =
    folderTitle || (yearLabel ? `${yearLabel} Leads` : activeFolderId.startsWith("year_") ? `${activeFolderId.replace("year_", "")} Leads` : activeFolderId === "website_form" ? "Website Form Leads" : "Hot Leads");
  const activeBadge =
    folderBadge || (activeFolderId === "website_form" ? "🌐 Website Form Inquiries" : activeFolderId === "hot_leads" ? "🔥 Admin Hot Leads" : `📁 ${yearLabel || activeFolderId.replace("year_", "")} Leads Cohort`);
  const activeDescription =
    folderDescription || `Select an area folder below to browse ${activeTitle} by territory, or view the complete master sheet.`;
  const countTotal = totalLeads ?? totalYearLeads ?? 0;
  const countBooked = totalBooked ?? totalYearBooked ?? 0;

  const q = searchQuery.toLowerCase().trim();
  const filteredAreas = areaSummaries.filter((a) => !q || a.area.toLowerCase().includes(q));
  const totalFilteredLeads = filteredAreas.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Command Strip */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-all shadow-sm group"
            title="Back to All Folders"
          >
            <ArrowLeft size={16} className="text-[#C9A84C] group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C9A84C]/15 text-[#E8CC7A] border border-[#C9A84C]/30">
                {activeBadge}
              </span>
              <span className="text-xs text-white/40 font-medium">
                {countTotal.toLocaleString("en-IN")} Total Records
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              <span>{activeTitle} Area & Locality Folders</span>
            </h2>
            <p className="text-xs text-white/50">
              {activeDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Real-time search across area folders */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Filter ${activeTitle} areas...`}
              className="w-48 md:w-56 bg-[#050E21] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]"
            />
          </div>

          {canManage && (
            <FolderAllocationButton
              folder={activeFolderId}
              folderName={activeTitle}
              adminUsers={adminUsers}
              lists={leadLists}
              availableAreas={areaSummaries.map((a) => a.area)}
              variant="toolbar"
            />
          )}

          <Link
            href={`/admin?folder=${activeFolderId}&area=all`}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-xs font-semibold text-white/80 hover:text-white transition-all inline-flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet size={14} className="text-[#C9A84C]" />
            <span>Master Sheet (All {countTotal.toLocaleString("en-IN")})</span>
          </Link>
        </div>
      </div>

      {/* 2. Sub-Folders Deck Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-white/50 px-1">
          <div className="flex items-center gap-2 font-semibold text-[#E8CC7A]">
            <MapPin size={14} className="text-[#C9A84C]" />
            <span className="uppercase tracking-wider">
              {filteredAreas.length} Area Folders in {activeTitle}
            </span>
          </div>
          {searchQuery && (
            <span>
              Matching <strong className="text-white">{totalFilteredLeads.toLocaleString("en-IN")}</strong> leads
            </span>
          )}
        </div>

        {filteredAreas.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#071228] border border-white/[0.08] text-center space-y-2">
            <p className="text-sm font-semibold text-white">No areas matched "{searchQuery}"</p>
            <p className="text-xs text-white/40">Try searching for a different locality or clear your filter.</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs font-bold text-[#C9A84C] hover:underline"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAreas.map((a) => {
              const convRate = a.count > 0 ? Math.round((a.bookedCount / a.count) * 100) : 0;
              return (
                <Link
                  key={a.area}
                  href={`/admin?folder=${activeFolderId}&area=${encodeURIComponent(a.area)}`}
                  className="group p-5 rounded-3xl bg-[#071228] border border-white/[0.08] hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/[0.03] transition-all shadow-lg hover:shadow-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center text-[#C9A84C] group-hover:scale-105 transition-transform">
                        <MapPin size={18} />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-white/[0.06] text-white/90 border border-white/10 text-xs font-bold tabular-nums">
                        {a.count.toLocaleString("en-IN")} Leads
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-[#E8CC7A] transition-colors truncate" title={a.area}>
                      📍 {a.area}
                    </h4>
                    <p className="text-[11px] text-white/40 mt-1">
                      {activeTitle} territory
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {a.bookedCount} booked
                      </span>
                      {a.unassignedCount != null && a.unassignedCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-bold inline-flex items-center gap-0.5">
                          <Zap size={9} className="fill-current" />
                          {a.unassignedCount} unassigned
                        </span>
                      )}
                    </div>

                    <span className="font-bold text-[#C9A84C] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      <span>Open</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
