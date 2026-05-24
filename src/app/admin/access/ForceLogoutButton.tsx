"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { forceLogoutAction } from "./actions";

/**
 * Per-row "force sign-out" button. Invalidates the user's active session
 * cookie so they're sent back to the login screen on their next request.
 * They keep their account and can log in again — this only kicks the live
 * session, useful when a device is lost or a session needs revoking quickly.
 */
export default function ForceLogoutButton({ email }: { email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!window.confirm(`Sign out ${email}? Their open admin tabs will be bounced to the login screen within a few seconds.`)) return;
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      await forceLogoutAction(fd);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="Force sign-out (ends their live session)"
      aria-label={`Force sign-out ${email}`}
      className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-amber-300 hover:bg-amber-500/15 transition-colors disabled:opacity-50"
    >
      <LogOut size={14} />
    </button>
  );
}
