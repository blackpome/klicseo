"use client";

import { useState } from "react";
import { UserPlus, X, SlidersHorizontal, Crown, UserCog, User, Lock } from "lucide-react";
import {
  ALL_PERMISSIONS,
  ROLE_LABEL,
  canManageRole,
  type AdminRole,
  type AdminUserRow,
} from "@/lib/admin-users-shared";
import { PERMISSION_ICON } from "./permission-ui";
import GrantForm from "./GrantForm";
import ResendButton from "./ResendButton";
import RemoveButton from "./RemoveButton";
import PermissionsEditor from "./PermissionsEditor";
import ForceLogoutButton from "./ForceLogoutButton";
import LogoutAllButton from "./LogoutAllButton";
import BlockButton from "./BlockButton";
import DemoteButton from "./DemoteButton";

const ROLE_STYLE: Record<AdminRole, { color: string; Icon: typeof Crown }> = {
  super_admin: { color: "#C9A84C", Icon: Crown },
  admin: { color: "#3B82F6", Icon: UserCog },
  staff: { color: "#10b981", Icon: User },
};

function AccessCell({ u }: { u: AdminUserRow }) {
  if (u.role !== "staff") {
    return <span className="text-[12px] text-[#C9A84C]">Full access</span>;
  }
  if (u.permissions.length === 0) {
    return <span className="text-[12px] text-white/35">No access</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {ALL_PERMISSIONS.filter((p) => u.permissions.includes(p.id)).map((p) => {
        const Icon = PERMISSION_ICON[p.id];
        return (
          <span
            key={p.id}
            title={p.label}
            className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/10 text-emerald-300"
          >
            <Icon size={13} />
          </span>
        );
      })}
    </div>
  );
}

export default function UserTable({
  users,
  meRole,
  meEmail,
  canMakeAdmin,
}: {
  users: AdminUserRow[];
  meRole: AdminRole;
  meEmail: string;
  canMakeAdmin: boolean;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-white/40">{users.length} {users.length === 1 ? "user" : "users"}</span>
        <div className="flex items-center gap-2">
          {meRole === "super_admin" && <LogoutAllButton />}
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#050E21]"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            <UserPlus size={16} /> Invite user
          </button>
        </div>
      </div>

      {/* Sheet */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-white/[0.03] text-white/45 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold px-4 py-2.5">User</th>
              <th className="text-left font-semibold px-4 py-2.5">Role</th>
              <th className="text-left font-semibold px-4 py-2.5">Access</th>
              <th className="text-right font-semibold px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          {users.map((u) => {
              const { color, Icon } = ROLE_STYLE[u.role];
              const initials = u.email.slice(0, 2).toUpperCase();
              const isSelf = u.email === meEmail;
              const manageable = canManageRole(meRole, u.role) && !isSelf;
              const isEditing = editing === u.email;

              return (
                <tbody key={u.id} className="border-t border-white/5">
                  <tr className="hover:bg-white/[0.02]">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                          style={{ background: `${color}1f`, color }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{u.email}</div>
                          {isSelf && <div className="text-[10px] text-white/35">you</div>}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                          style={{ background: `${color}1f`, color }}
                        >
                          <Icon size={11} /> {ROLE_LABEL[u.role]}
                        </span>
                        {u.status === "revoked" && (
                          <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-300">
                            Blocked
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Access */}
                    <td className="px-4 py-3"><AccessCell u={u} /></td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {manageable ? (
                          <>
                            {u.role === "staff" && (
                              <button
                                onClick={() => setEditing(isEditing ? null : u.email)}
                                title="Edit permissions"
                                className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                                  isEditing ? "bg-[#C9A84C]/20 text-[#C9A84C]" : "bg-white/5 text-white/60 hover:bg-white/10"
                                }`}
                              >
                                <SlidersHorizontal size={15} />
                              </button>
                            )}
                            <ResendButton email={u.email} />
                            {u.role !== "super_admin" && <ForceLogoutButton email={u.email} />}
                            {/* Super-admin only: demote admins to staff. */}
                            {meRole === "super_admin" && u.role === "admin" && (
                              <DemoteButton email={u.email} />
                            )}
                            {/* Super-admin only: suspend / restore. */}
                            {meRole === "super_admin" && u.role !== "super_admin" && (
                              <BlockButton email={u.email} currentStatus={u.status} />
                            )}
                            <RemoveButton email={u.email} />
                          </>
                        ) : (
                          <span title={isSelf ? "Your own account" : "Can’t manage"} className="grid h-8 w-8 place-items-center text-white/20">
                            <Lock size={14} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded permission editor row */}
                  {isEditing && u.role === "staff" && manageable && (
                    <tr className="bg-white/[0.015]">
                      <td colSpan={4} className="px-4 pb-4">
                        <PermissionsEditor email={u.email} permissions={u.permissions} />
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
        </table>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInviteOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1430] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
                  <UserPlus className="text-[#C9A84C]" size={18} />
                </div>
                <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
                  Invite user
                </h2>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <GrantForm canMakeAdmin={canMakeAdmin} bare />
          </div>
        </div>
      )}
    </div>
  );
}
