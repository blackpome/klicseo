"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import { demoteToStaffAction } from "./actions";

/**
 * Demote an admin to staff (strip their full-access role; permissions reset
 * to none). Super-admin only; only renders for admin rows. The user is also
 * force-signed-out so their next request picks up the new role.
 */
export default function DemoteButton({ email }: { email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!window.confirm(`Demote ${email} from admin to staff? They'll lose every permission and get signed out immediately — you'll need to re-grant any access you want them to keep.`)) return;
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      await demoteToStaffAction(fd);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="Demote admin → staff"
      aria-label={`Demote ${email} to staff`}
      className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-amber-300 hover:bg-amber-500/15 transition-colors disabled:opacity-50"
    >
      <ArrowDownToLine size={14} />
    </button>
  );
}
