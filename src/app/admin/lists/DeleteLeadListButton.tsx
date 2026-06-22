"use client";

import { useFormStatus } from "react-dom";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLeadListAction } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Delete list"
      className="grid h-8 w-8 place-items-center rounded-lg text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}

// Icon-only delete. Confirms before deleting (irreversible).
export default function DeleteLeadListButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteLeadListAction}
      onSubmit={(e) => {
        if (!confirm(`Delete list "${name}"? This will remove all lead associations.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
