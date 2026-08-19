"use client";

import { useState, useEffect } from "react";

/**
 * Hook to retrieve and temporarily highlight a lead row that was recently viewed.
 * Clears after 4.5 seconds.
 */
export function useHighlightedLead(): string | null {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check URL search param or hash
    const urlParams = new URLSearchParams(window.location.search);
    const urlHighlighted = urlParams.get("highlighted");
    const hashMatch = window.location.hash.match(/#lead-(.+)/);
    const hashId = hashMatch ? hashMatch[1] : null;

    // 2. Check sessionStorage
    const storedId = sessionStorage.getItem("klicseo_last_viewed_lead_id");
    const storedTime = Number(sessionStorage.getItem("klicseo_last_viewed_lead_time") || 0);
    const isRecent = Date.now() - storedTime < 120_000; // within 2 minutes

    const targetId = urlHighlighted || hashId || (isRecent ? storedId : null);

    if (targetId) {
      setHighlightedId(targetId);

      // Scroll smoothly into view if needed
      requestAnimationFrame(() => {
        const el = document.getElementById(`lead-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });

      // Clear highlight after 4.5 seconds
      const timer = setTimeout(() => {
        setHighlightedId(null);
        try {
          sessionStorage.removeItem("klicseo_last_viewed_lead_id");
          sessionStorage.removeItem("klicseo_last_viewed_lead_time");
        } catch {}
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, []);

  return highlightedId;
}

/**
 * Helper to record that a lead was clicked/viewed.
 */
export function markLeadViewed(leadId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("klicseo_last_viewed_lead_id", leadId);
    sessionStorage.setItem("klicseo_last_viewed_lead_time", Date.now().toString());
  } catch {}
}
