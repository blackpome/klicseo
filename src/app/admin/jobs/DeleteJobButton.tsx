"use client";

import { Trash2 } from "lucide-react";
import { deleteJobAction } from "./actions";

export default function DeleteJobButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={deleteJobAction} onSubmit={(e) => { if (!confirm(`Delete “${title}”? This removes the listing.`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button title="Delete" className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20">
        <Trash2 size={14} />
      </button>
    </form>
  );
}
