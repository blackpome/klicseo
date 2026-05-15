"use client";

import { useState, useTransition } from "react";
import { updateNotesAction } from "../actions";

export default function LeadNotesEditor({ id, initialNotes }: { id: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = notes !== initialNotes;

  function save() {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("notes", notes);
    start(async () => {
      await updateNotesAction(fd);
      setSavedAt(Date.now());
    });
  }

  return (
    <div className="pt-1">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="Internal notes — call outcomes, customer requests, follow-up date…"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-white/40">
          {pending
            ? "Saving…"
            : savedAt
            ? `Saved ${new Date(savedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
            : dirty
            ? "Unsaved changes"
            : ""}
        </span>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          Save notes
        </button>
      </div>
    </div>
  );
}
