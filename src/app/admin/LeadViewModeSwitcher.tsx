"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, TableProperties } from "lucide-react";

interface Props {
  currentView: "cards" | "table";
}

export default function LeadViewModeSwitcher({ currentView }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Hydrate user preference from localStorage if not specified in URL
  useEffect(() => {
    if (!searchParams.get("view")) {
      const saved = localStorage.getItem("klicseo_lead_view_mode");
      if (saved === "table" || saved === "cards") {
        if (saved !== currentView) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("view", saved);
          router.replace(`${pathname}?${params.toString()}`);
        }
      }
    }
  }, [searchParams, currentView, pathname, router]);

  const setViewMode = (mode: "cards" | "table") => {
    localStorage.setItem("klicseo_lead_view_mode", mode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm">
      <button
        type="button"
        onClick={() => setViewMode("cards")}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
          currentView === "cards"
            ? "bg-[#C9A84C] text-[#050E21] shadow-sm font-bold"
            : "text-white/60 hover:text-white hover:bg-white/[0.06]"
        }`}
        title="Manual Card View"
      >
        <LayoutGrid size={13} />
        <span>Cards</span>
      </button>

      <button
        type="button"
        onClick={() => setViewMode("table")}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
          currentView === "table"
            ? "bg-[#C9A84C] text-[#050E21] shadow-sm font-bold"
            : "text-white/60 hover:text-white hover:bg-white/[0.06]"
        }`}
        title="Spreadsheet Sheet View"
      >
        <TableProperties size={13} />
        <span>Sheet</span>
      </button>
    </div>
  );
}
