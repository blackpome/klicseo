"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLeadListAction } from "./actions";

export default function DeleteLeadListButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete list "${name}"? This will remove all lead associations.`)) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", id);
      await deleteLeadListAction(formData);
      if (typeof window !== "undefined") {
        window.location.href = "/admin/lists";
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      title="Delete list"
      className="grid h-7 w-7 place-items-center rounded-lg text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin text-rose-400" />
      ) : (
        <Trash2 size={13} />
      )}
    </button>
  );
}
