"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, ShieldCheck } from "lucide-react";
import { toggleBlockAction } from "./actions";

/**
 * Toggle a user's status active ↔ revoked. Blocking suspends every login +
 * kills the live session; unblocking restores access. Super-admin only.
 */
export default function BlockButton({ email, currentStatus }: { email: string; currentStatus: "active" | "revoked" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const blocked = currentStatus === "revoked";

  const onClick = () => {
    const next = blocked ? "active" : "revoked";
    const msg = blocked
      ? `Unblock ${email}? They'll be able to log in again.`
      : `Block ${email}? Their access is suspended until you unblock — also signs them out immediately.`;
    if (!window.confirm(msg)) return;
    const fd = new FormData();
    fd.set("email", email);
    fd.set("status", next);
    startTransition(async () => {
      await toggleBlockAction(fd);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={blocked ? "Unblock — restore access" : "Block — suspend access without deleting"}
      aria-label={blocked ? `Unblock ${email}` : `Block ${email}`}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:opacity-50 ${
        blocked
          ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          : "bg-white/5 text-red-300 hover:bg-red-500/15"
      }`}
    >
      {blocked ? <ShieldCheck size={14} /> : <Ban size={14} />}
    </button>
  );
}
