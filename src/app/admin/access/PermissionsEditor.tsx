"use client";

import { useActionState, useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { updatePermissionsAction } from "./actions";
import { ALL_PERMISSIONS, type Permission } from "@/lib/admin-users-shared";
import { PERMISSION_ICON } from "./permission-ui";

// Staff permission editor with explicit save feedback. Tracks which boxes are
// checked locally so we can (a) show a "dirty" hint when there are unsaved
// changes and (b) re-arm the Save button after a save.
export default function PermissionsEditor({
  email,
  permissions,
}: {
  email: string;
  permissions: Permission[];
}) {
  const [state, action, pending] = useActionState(
    updatePermissionsAction,
    {} as { error?: string; ok?: string },
  );

  const initial = new Set(permissions);
  const [checked, setChecked] = useState<Set<Permission>>(new Set(permissions));

  const dirty =
    checked.size !== initial.size || [...checked].some((p) => !initial.has(p));

  const toggle = (p: Permission, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });
  };

  return (
    <form action={action} className="mt-4 border-t border-white/5 pt-4">
      <input type="hidden" name="email" value={email} />
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/30 mb-2">Permissions</p>

      <div className="grid sm:grid-cols-2 gap-2">
        {ALL_PERMISSIONS.map((p) => {
          const Icon = PERMISSION_ICON[p.id];
          const on = checked.has(p.id);
          return (
            <label
              key={p.id}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                on ? "border-[#C9A84C]/40 bg-[#C9A84C]/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <input
                type="checkbox"
                name="permissions"
                value={p.id}
                checked={on}
                onChange={(e) => toggle(p.id, e.target.checked)}
                className="sr-only"
              />
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                  on ? "bg-[#C9A84C]/20 text-[#C9A84C]" : "bg-white/5 text-white/40"
                }`}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{p.label}</span>
                <span className="text-[11px] text-white/40">{p.blurb}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-60 ${
            dirty
              ? "bg-[#C9A84C] text-[#050E21] hover:brightness-110"
              : "bg-white/10 text-white/70 hover:bg-white/15"
          }`}
        >
          {pending ? "Saving…" : dirty ? "Save changes" : "Save permissions"}
        </button>

        {dirty && !pending && (
          <span className="text-[11px] text-amber-300">Unsaved changes</span>
        )}
        {!dirty && state.ok && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <Check size={13} /> {state.ok}
          </span>
        )}
        {state.error && (
          <span className="inline-flex items-center gap-1 text-[11px] text-red-300">
            <AlertCircle size={13} /> {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
