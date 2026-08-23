"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Globe,
  Flame,
  Calendar,
  Folder,
  FolderPlus,
  Layers,
  ChevronRight,
  User,
  CheckCircle2,
} from "lucide-react";
import type { FolderSummary } from "@/lib/leads";
import CreateFolderModal from "./CreateFolderModal";

interface Props {
  systemFolders: FolderSummary[];
  customFolders: FolderSummary[];
  totalLeads: number;
  activeFolder?: string;
  adminUsers?: { id: string; email: string; name: string }[];
  canManage?: boolean;
}

export default function FolderCardsDeck({
  systemFolders,
  customFolders,
  totalLeads,
  activeFolder,
  adminUsers = [],
  canManage = true,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const buildFolderHref = (folderId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!folderId || folderId === "all") {
      params.delete("folder");
      params.delete("year");
      params.delete("source");
    } else {
      params.set("folder", folderId);
      params.delete("year");
      params.delete("source");
    }
    params.set("page", "1");
    const qs = params.toString();
    return `/admin${qs ? `?${qs}` : ""}`;
  };

  const handleCreatedFolder = (newFolderId: string) => {
    router.push(buildFolderHref(newFolderId));
  };

  const isAllActive = !activeFolder || activeFolder === "all";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-[#C9A84C]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">
            Lead Folders & Category Cards
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50 font-medium">
            {systemFolders.length + customFolders.length} Folders
          </span>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-bold text-[#E8CC7A] hover:text-white bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 border border-[#C9A84C]/30 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
          >
            <FolderPlus size={13} />
            <span>+ Create Folder</span>
          </button>
        )}
      </div>

      {/* Responsive Horizontal Scrolling Cards Deck */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* Card 0: All Leads Universal Folder */}
        <Link
          href={buildFolderHref(null)}
          className={`min-w-[190px] max-w-[210px] p-3.5 rounded-2xl border transition-all flex flex-col justify-between shrink-0 group ${
            isAllActive
              ? "bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border-[#C9A84C]/50 shadow-md shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]/30"
              : "bg-[#071228] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#C9A84C]">
                <Layers size={14} />
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isAllActive ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/10 text-white/60"
                }`}
              >
                All
              </span>
            </div>
            <div className="text-sm font-bold text-white group-hover:text-[#E8CC7A] transition-colors truncate">
              All Leads
            </div>
            <div className="text-[10px] text-white/40 line-clamp-1 mt-0.5">
              Complete CRM database
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-base font-extrabold text-white tabular-nums">
              {totalLeads.toLocaleString("en-IN")}
            </span>
            <ChevronRight size={13} className="text-white/30 group-hover:text-white transition-colors" />
          </div>
        </Link>

        {/* System Folder Cards (Website Form, Hot Leads, Years) */}
        {systemFolders.map((folder) => {
          const isActive = activeFolder === folder.id;
          const isWebsite = folder.id === "website_form";
          const isHot = folder.id === "hot_leads";
          const isYear = folder.type === "system_year";

          let icon = <Folder size={14} />;
          let iconColor = "text-[#C9A84C]";
          let bgGradient = "from-[#C9A84C]/15 to-[#C9A84C]/5 border-[#C9A84C]/40";

          if (isWebsite) {
            icon = <Globe size={14} />;
            iconColor = "text-sky-400";
            bgGradient = "from-sky-500/20 to-sky-500/5 border-sky-500/40";
          } else if (isHot) {
            icon = <Flame size={14} />;
            iconColor = "text-amber-400";
            bgGradient = "from-amber-500/20 to-amber-500/5 border-amber-500/40";
          } else if (isYear) {
            icon = <Calendar size={14} />;
            iconColor = "text-purple-400";
            bgGradient = "from-purple-500/20 to-purple-500/5 border-purple-500/40";
          }

          return (
            <Link
              key={folder.id}
              href={buildFolderHref(folder.id)}
              className={`min-w-[190px] max-w-[210px] p-3.5 rounded-2xl border transition-all flex flex-col justify-between shrink-0 group ${
                isActive
                  ? `bg-gradient-to-br ${bgGradient} shadow-md ring-1 ring-white/20`
                  : "bg-[#071228] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center ${iconColor}`}>
                    {icon}
                  </div>
                  {folder.bookedCount > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                      {folder.bookedCount} booked
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-white group-hover:text-[#E8CC7A] transition-colors truncate">
                  {folder.name}
                </div>
                <div className="text-[10px] text-white/40 line-clamp-1 mt-0.5">
                  {folder.description || "Organized lead folder"}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-base font-extrabold text-white tabular-nums">
                  {folder.count.toLocaleString("en-IN")}
                </span>
                <ChevronRight size={13} className="text-white/30 group-hover:text-white transition-colors" />
              </div>
            </Link>
          );
        })}

        {/* Custom Admin Folder Cards */}
        {customFolders.map((folder) => {
          const isActive = activeFolder === folder.id;

          return (
            <Link
              key={folder.id}
              href={buildFolderHref(folder.id)}
              className={`min-w-[200px] max-w-[225px] p-3.5 rounded-2xl border transition-all flex flex-col justify-between shrink-0 group ${
                isActive
                  ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/50 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                  : "bg-[#071228] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Folder size={14} />
                  </div>
                  {folder.assignedStaffName && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20 truncate max-w-[90px] inline-flex items-center gap-1">
                      <User size={9} />
                      <span>{folder.assignedStaffName}</span>
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-white group-hover:text-[#E8CC7A] transition-colors truncate">
                  {folder.name}
                </div>
                <div className="text-[10px] text-white/40 line-clamp-1 mt-0.5">
                  Custom Campaign Folder
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-base font-extrabold text-emerald-400 tabular-nums">
                  {folder.count.toLocaleString("en-IN")} <span className="text-xs font-normal text-white/50">leads</span>
                </span>
                <ChevronRight size={13} className="text-white/30 group-hover:text-white transition-colors" />
              </div>
            </Link>
          );
        })}

        {/* Quick "+ New Folder" Card */}
        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="min-w-[150px] p-3.5 rounded-2xl border border-dashed border-white/20 hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5 text-white/50 hover:text-white transition-all flex flex-col items-center justify-center gap-2 shrink-0 group"
          >
            <div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-[#C9A84C]/20 border border-white/10 group-hover:border-[#C9A84C]/40 flex items-center justify-center text-white/60 group-hover:text-[#E8CC7A] transition-all">
              <FolderPlus size={16} />
            </div>
            <span className="text-xs font-bold group-hover:text-[#E8CC7A] transition-colors">
              + New Folder
            </span>
          </button>
        )}
      </div>

      <CreateFolderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        adminUsers={adminUsers}
        onSuccess={handleCreatedFolder}
      />
    </div>
  );
}
