"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls /api/admin/whoami every few seconds and on tab focus. If the session
 * is no longer valid (e.g. a super-admin clicked Force Logout from another
 * device), the user is immediately bounced to /admin/login.
 *
 * Mounted once at the AdminShell level so every admin page inherits it.
 */
const DEFAULT_INTERVAL_MS = 5_000;

export default function AuthSessionGuard({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const probe = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const res = await fetch("/api/admin/whoami", { cache: "no-store" });
        if (!cancelled && res.status === 401) {
          // Replace (not push) so back-button doesn't return to the gated page.
          router.replace("/admin/login");
        }
      } catch {
        // network blip — try again on the next tick.
      } finally {
        inFlight = false;
      }
    };

    // Probe immediately on mount, then on a timer, and whenever the tab
    // regains focus (so a sign-out is noticed instantly when admin returns).
    probe();
    const id = setInterval(probe, intervalMs);
    const onVis = () => { if (document.visibilityState === "visible") probe(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", probe);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", probe);
    };
  }, [intervalMs, router]);

  return null;
}
