"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteEmployeeAction } from "../actions";

export default function DeleteEmployeeButton({ id }: { id: string }) {
  return (
    <form
      action={deleteEmployeeAction}
      onSubmit={(e) => {
        if (!confirm("Delete this employee record permanently? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
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
