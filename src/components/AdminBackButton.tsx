"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import React from "react";

export interface AdminBackButtonProps {
  fallbackHref: string;
  label?: string;
  className?: string;
  iconSize?: number;
  preferHistory?: boolean;
}

export default function AdminBackButton({
  fallbackHref,
  label = "Back",
  className = "inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors",
  iconSize = 13,
  preferHistory = true,
}: AdminBackButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow opening in new tab or window via middle-click or modifiers
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    if (preferHistory && typeof window !== "undefined") {
      // Check if user came from a page within the same application
      const hasHistory = typeof window.history !== "undefined" && window.history.length > 1;
      const sameOriginReferrer =
        typeof document !== "undefined" &&
        document.referrer &&
        document.referrer.startsWith(window.location.origin);

      if (hasHistory && sameOriginReferrer) {
        e.preventDefault();
        window.history.back();
        return;
      }
    }
    // Fallback: Link navigation to fallbackHref will execute naturally
  };

  return (
    <Link href={fallbackHref} onClick={handleClick} className={className}>
      <ArrowLeft size={iconSize} className="shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
