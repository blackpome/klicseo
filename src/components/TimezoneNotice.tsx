"use client";

import { useEffect, useState } from "react";

export default function TimezoneNotice() {
  const [tz, setTz] = useState<string | null>(null);

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone !== "Asia/Kolkata") setTz(zone);
  }, []);

  if (!tz) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
      <span className="mt-0.5 shrink-0">⚠</span>
      <span>
        Your browser is in <strong>{tz}</strong> — all timestamps in this panel are displayed in{" "}
        <strong>IST (UTC+5:30)</strong>, not your local time.
      </span>
    </div>
  );
}
