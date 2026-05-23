"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import {
  canManageRole,
  deleteAccess,
  getAdminUser,
  grantAccess,
  isPermission,
  normalizeEmail,
  resendInvite,
  updatePermissions,
  type AdminRole,
  type Permission,
} from "@/lib/admin-users";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
  return me;
}

function readPermissions(formData: FormData): Permission[] {
  return formData.getAll("permissions").map(String).filter(isPermission);
}

export async function grantAccessAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const me = await requireManager();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "staff") as AdminRole;

  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (role !== "admin" && role !== "staff") return { error: "Invalid role." };
  if (!canManageRole(me.role, role)) {
    return { error: "You can only grant access at or below your own level." };
  }

  const permissions = role === "staff" ? readPermissions(formData) : [];
  if (role === "staff" && permissions.length === 0) {
    return { error: "Select at least one permission for staff." };
  }

  let result: { emailSent: boolean; emailError?: string };
  try {
    result = await grantAccess({ email, role, permissions, invitedBy: me.email });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not grant access." };
  }

  await logAudit("access.grant", { entity: "access", entityId: email, summary: `Granted ${role} access to ${email}`, metadata: { role, permissions } });
  revalidatePath("/admin/access");

  // Row is created either way; only the email may have failed.
  if (!result.emailSent) {
    return {
      error: `${email} was added, but the invite email didn’t send (${result.emailError}). Fix SMTP, then click Resend.`,
    };
  }
  return { ok: `Invite sent to ${email}.` };
}

// Shared guard for status / permission edits on an existing row.
async function loadManageable(email: string) {
  const me = await requireManager();
  const target = await getAdminUser(email);
  if (!target) throw new Error("No such user.");
  if (!canManageRole(me.role, target.role)) throw new Error("Forbidden");
  return { me, target };
}

// Revoke = fully remove the person (delete allowlist row + auth account).
export async function revokeAccessAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  await loadManageable(email);
  await deleteAccess(email);
  await logAudit("access.revoke", { entity: "access", entityId: email, summary: `Removed access for ${email}` });
  revalidatePath("/admin/access");
}

export async function resendInviteAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  try {
    await loadManageable(email);
    const kind = await resendInvite(email);
    return { ok: kind === "invite" ? "Invite re-sent." : "Reset link sent." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not resend." };
  }
}

export async function updatePermissionsAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  try {
    const { target } = await loadManageable(email);
    if (target.role !== "staff") return { error: "Only staff have editable permissions." };
    const permissions = readPermissions(formData);
    await updatePermissions(email, permissions);
    await logAudit("access.permissions", { entity: "access", entityId: email, summary: `Updated permissions for ${email}`, metadata: { permissions } });
    revalidatePath("/admin/access");
    const n = permissions.length;
    return {
      ok: n === 0
        ? "Saved — no permissions (this person can’t access anything yet)."
        : `Saved — ${n} permission${n > 1 ? "s" : ""} now active.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t save permissions." };
  }
}
