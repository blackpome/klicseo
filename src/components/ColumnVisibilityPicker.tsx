"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Check, Lock, RotateCcw, Eye } from "lucide-react";
import type { ColumnDefinition } from "@/lib/useColumnPreferences";

interface Props {
  columns: ColumnDefinition[];
  isVisible: (key: string) => boolean;
  toggleColumn: (key: string) => void;
  showAll: () => void;
  resetToDefault: () => void;
  visibleCount: number;
  totalCount: number;
}

export default function ColumnVisibilityPicker({
  columns,
  isVisible,
  toggleColumn,
  showAll,
  resetToDefault,
  visibleCount,
  totalCount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
          isOpen
            ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#E8CC7A]"
            : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]"
        }`}
        title="Customize Table Columns"
      >
        <SlidersHorizontal size={13} className="text-[#C9A84C]" />
        <span>Columns</span>
        <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] tabular-nums font-normal text-white/60">
          {visibleCount}/{totalCount}
        </span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#071228] border border-white/15 p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={13} className="text-[#C9A84C]" />
              <span>Visible Columns</span>
            </span>
            <span className="text-[10px] text-white/40 tabular-nums">
              {visibleCount} of {totalCount} active
            </span>
          </div>

          {/* List of Column Checkboxes */}
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {columns.map((col) => {
              const active = isVisible(col.key);
              return (
                <button
                  type="button"
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  disabled={col.required}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                    col.required
                      ? "opacity-60 cursor-not-allowed bg-white/[0.02]"
                      : active
                      ? "bg-white/[0.06] hover:bg-white/[0.09] text-white font-medium"
                      : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                        active
                          ? "bg-[#C9A84C] text-black border-[#E8CC7A] font-bold"
                          : "border-white/20 text-transparent"
                      }`}
                    >
                      {active && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{col.label}</span>
                  </div>

                  {col.required && (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/40 flex items-center gap-0.5">
                      <Lock size={8} /> Lock
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="border-t border-white/[0.08] pt-2.5 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={showAll}
              className="text-[#E8CC7A] hover:underline font-semibold"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              className="text-white/50 hover:text-white transition-colors flex items-center gap-1"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
