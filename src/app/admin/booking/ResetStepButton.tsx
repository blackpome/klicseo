"use client";

import { useTransition } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { resetBookingStepAction } from "./actions";

// Resets one step to defaults (server), then reloads so the form fields and the
// add/toggle widgets re-initialise from the cleared config.
export default function ResetStepButton({ stepKey, label }: { stepKey: string; label: string }) {
  const [pending, start] = useTransition();

  function reset() {
    if (!confirm(`Reset “${label}” to defaults? This clears its text, custom fields, and toggles.`)) return;
    start(async () => {
      try {
        await resetBookingStepAction(stepKey);
        window.location.reload();
      } catch {
        /* ignore — leave the form as-is on failure */
      }
    });
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 disabled:opacity-60"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
      {pending ? "Resetting…" : "Reset step"}
    </button>
  );
}
