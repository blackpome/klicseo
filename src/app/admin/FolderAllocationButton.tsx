"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import LeadAllocationModal from "./lists/LeadAllocationModal";
import type { LeadListRow } from "@/lib/leadLists-shared";

interface Props {
  folder?: string;
  area?: string;
  folderName?: string;
  adminUsers: { id: string; email: string; name: string }[];
  lists: LeadListRow[];
  availableAreas?: string[];
  allFolders?: Array<{ id: string; name: string; count: number }>;
  variant?: "primary" | "secondary" | "toolbar";
  className?: string;
}

export default function FolderAllocationButton({
  folder,
  area,
  folderName,
  adminUsers,
  lists,
  availableAreas,
  allFolders,
  variant = "primary",
  className = "",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          (variant === "toolbar"
            ? "px-3.5 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#E8CC7A] text-[#050E21] font-bold text-xs transition-all inline-flex items-center gap-1.5 shadow-md shadow-[#C9A84C]/20 cursor-pointer whitespace-nowrap"
            : "px-4 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#E8CC7A] text-[#050E21] font-bold text-xs transition-all inline-flex items-center gap-2 shadow-lg shadow-[#C9A84C]/25 cursor-pointer whitespace-nowrap")
        }
      >
        <Zap size={14} className="fill-current text-[#050E21]" />
        <span>
          {folder ? `Allocate Leads (${folderName || "Folder"})` : "Allocate & Schedule"}
        </span>
      </button>

      {isOpen && (
        <LeadAllocationModal
          lists={lists}
          adminUsers={adminUsers}
          availableAreas={availableAreas}
          defaultFolder={folder}
          defaultArea={area}
          folderName={folderName}
          allFolders={allFolders}
          initialCount={
            folder
              ? allFolders?.find((f) => f.id === folder)?.count
              : allFolders?.reduce((sum, f) => sum + f.count, 0)
          }
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={(msg) => {
            alert(msg);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
