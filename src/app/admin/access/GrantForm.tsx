"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { grantAccessAction } from "./actions";
import { ALL_PERMISSIONS, type AdminRole } from "@/lib/admin-users-shared";
import { PERMISSION_ICON } from "./permission-ui";

// Grant form. `canMakeAdmin` is true only for super_admins; admins can create
// staff only. Permission checkboxes show only when the chosen role is staff
// (admins implicitly hold every permission). `bare` drops the outer card so it
// can sit inside a modal that provides its own chrome.
export default function GrantForm({
  canMakeAdmin,
  employees,
  bare = false,
}: {
  canMakeAdmin: boolean;
  employees: { id: string; name: string }[];
  bare?: boolean;
}) {
  const [state, action, pending] = useActionState(grantAccessAction, {} as { error?: string; ok?: string });
  const [role, setRole] = useState<AdminRole>("staff");

  return (
    <form
      action={action}
      className={
        bare
          ? "space-y-4"
          : "rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 space-y-4"
      }
    >
      {!bare && (
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <UserPlus className="text-[#C9A84C]" size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              Invite someone
            </h2>
            <p className="text-[11px] text-white/40">Send an email invite and set their access.</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Email</span>
          <input
            type="email"
            name="email"
            required
            placeholder="person@example.com"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Role</span>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
          >
            <option value="staff">Staff</option>
            {canMakeAdmin && <option value="admin">Admin (full access)</option>}
          </select>
        </label>
      </div>

      {role === "staff" && (
        <>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/45">Employee record</span>
            <select
              name="employee_id"
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
            >
              <option value="">- Not linked -</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-[11px] uppercase tracking-wider text-white/45 mb-1">Permissions</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((p) => {
                const Icon = PERMISSION_ICON[p.id];
                return (
                  <label
                    key={p.id}
                    className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 cursor-pointer hover:bg-white/[0.04] has-[:checked]:border-[#C9A84C]/40 has-[:checked]:bg-[#C9A84C]/10"
                  >
                    <input type="checkbox" name="permissions" value={p.id} className="peer sr-only" />
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/5 text-white/40 peer-checked:bg-[#C9A84C]/20 peer-checked:text-[#C9A84C]">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="text-sm font-medium block">{p.label}</span>
                      <span className="text-[11px] text-white/40">{p.blurb}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-white/35">“Manage” automatically includes “view”.</p>
          </fieldset>
        </>
      )}

      {state.error && <p className="text-[12px] text-red-300">{state.error}</p>}
      {state.ok && <p className="text-[12px] text-emerald-300">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        {pending ? "Sending invite…" : "Send invite"}
      </button>
    </form>
  );
}
