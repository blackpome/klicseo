"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PowerOff, Check, AlertCircle } from "lucide-react";
import { forceLogoutAllAction } from "./actions";

/**
 * Bulk force sign-out — kicks the live session of every admin user EXCEPT
 * super-admins and the caller themselves. Visible only to super-admin.
 */
export default function LogoutAllButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);

  const onClick = () => {
    if (!window.confirm("Sign out every admin and staff member (super-admins kept signed in)? Their open admin tabs will be bounced to the login screen within a few seconds.")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await forceLogoutAllAction();
      setMsg(res);
      router.refresh();
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title="Sign out every admin/staff (super-admins kept in)"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-200 bg-amber-500/10 ring-1 ring-amber-500/30 hover:bg-amber-500/20 disabled:opacity-50"
      >
        <PowerOff size={13} /> {pending ? "Signing out…" : "Sign out all"}
      </button>
      {msg?.ok && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300"><Check size={12} /> {msg.ok}</span>}
      {msg?.error && <span className="inline-flex items-center gap-1 text-[11px] text-red-300"><AlertCircle size={12} /> {msg.error}</span>}
    </div>
  );
}
