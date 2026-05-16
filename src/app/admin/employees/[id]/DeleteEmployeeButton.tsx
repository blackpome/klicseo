"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteEmployeeAction } from "../actions";

export default function DeleteEmployeeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();

  function handle() {
    if (!confirm("Delete this employee record permanently? This cannot be undone.")) return;
    const fd = new FormData();
    fd.append("id", id);
    start(() => deleteEmployeeAction(fd));
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-400/10 disabled:opacity-50"
    >
      <Trash2 size={12} /> {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
