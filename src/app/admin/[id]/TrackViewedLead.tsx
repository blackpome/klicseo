"use client";

import { useEffect } from "react";
import { markLeadViewed } from "@/lib/useHighlightedLead";

export default function TrackViewedLead({ id }: { id: string }) {
  useEffect(() => {
    if (id) {
      markLeadViewed(id);
    }
  }, [id]);

  return null;
}
