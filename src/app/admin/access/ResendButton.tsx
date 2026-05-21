"use client";

import { useActionState } from "react";
import { Send, Check, Loader2 } from "lucide-react";
import { resendInviteAction } from "./actions";

// Icon-only resend. Shows a spinner while sending and a green check on success.
export default function ResendButton({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendInviteAction, {} as { error?: string; ok?: string });

  return (
    <form action={action} className="inline-flex items-center">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending}
        title={state.error ? state.error : state.ok ? "Sent" : "Resend invite"}
        className={`grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:opacity-60 ${
          state.error ? "text-red-300 bg-red-500/10" : state.ok ? "text-emerald-300 bg-emerald-500/10" : "text-white/60 bg-white/5 hover:bg-white/10"
        }`}
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : state.ok ? <Check size={15} /> : <Send size={15} />}
      </button>
    </form>
  );
}
