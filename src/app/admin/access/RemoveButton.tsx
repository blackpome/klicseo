"use client";

import { useFormStatus } from "react-dom";
import { Trash2, Loader2 } from "lucide-react";
import { revokeAccessAction } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Remove access"
      className="grid h-8 w-8 place-items-center rounded-lg text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}

// Icon-only remove. Confirms before deleting (irreversible).
export default function RemoveButton({ email }: { email: string }) {
  return (
    <form
      action={revokeAccessAction}
      onSubmit={(e) => {
        if (!confirm(`Remove ${email}? This deletes their account and can’t be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="email" value={email} />
      <Submit />
    </form>
  );
}
