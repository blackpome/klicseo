"use client";

import { useState, useEffect, useCallback } from "react";

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible?: boolean;
  required?: boolean; // Cannot be hidden (e.g., Lead Name)
  description?: string;
}

export function useColumnPreferences(
  storageKey: string,
  columns: ColumnDefinition[],
) {
  // Default map
  const defaultVisibility = useCallback(() => {
    const map: Record<string, boolean> = {};
    for (const col of columns) {
      map[col.key] = col.required || col.defaultVisible !== false;
    }
    return map;
  }, [columns]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(defaultVisibility);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "object" && parsed !== null) {
          // Ensure required columns are always true
          const merged = { ...defaultVisibility(), ...parsed };
          for (const col of columns) {
            if (col.required) merged[col.key] = true;
          }
          setVisibleColumns(merged);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsHydrated(true);
  }, [storageKey, defaultVisibility, columns]);

  // Toggle a single column
  const toggleColumn = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (col?.required) return; // Cannot toggle locked column

    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Show all columns
  const showAll = () => {
    const allOn: Record<string, boolean> = {};
    for (const col of columns) {
      allOn[col.key] = true;
    }
    setVisibleColumns(allOn);
    try {
      localStorage.setItem(storageKey, JSON.stringify(allOn));
    } catch {}
  };

  // Reset to default columns
  const resetToDefault = () => {
    const defaults = defaultVisibility();
    setVisibleColumns(defaults);
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    } catch {}
  };

  const isVisible = (key: string) => {
    if (!isHydrated) {
      // Return default visibility prior to hydration to avoid layout shifts
      const col = columns.find((c) => c.key === key);
      return col?.required || col?.defaultVisible !== false;
    }
    return Boolean(visibleColumns[key]);
  };

  const visibleCount = columns.filter((c) => isVisible(c.key)).length;

  return {
    columns,
    visibleColumns,
    isVisible,
    toggleColumn,
    showAll,
    resetToDefault,
    visibleCount,
    totalCount: columns.length,
    isHydrated,
  };
}
