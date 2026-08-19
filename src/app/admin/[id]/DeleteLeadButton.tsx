"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteLeadAction } from "../actions";

// Using a real <form> + server action (rather than useTransition) so Next's
// server-action runtime processes the redirect() and revalidatePath() calls.
// The confirm prompt runs in onSubmit and aborts the submission on cancel.
export default function DeleteLeadButton({ id, returnTo }: { id: string; returnTo?: string }) {
  return (
    <form
      action={deleteLeadAction}
      onSubmit={(e) => {
        if (!confirm("Delete this lead permanently? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-400/10 disabled:opacity-50"
    >
      <Trash2 size={12} /> {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
