import "server-only";
import { supabase } from "./supabase";
import { supabaseAuth } from "./supabase-auth";
import {
  EVERY_PERMISSION,
  expandPermissions,
  type AdminPrincipal,
  type AdminRole,
  type AdminUserRow,
  type Permission,
} from "./admin-users-shared";

export * from "./admin-users-shared";

const TABLE = "admin_users";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function superAdminEmail(): string | null {
  const e = process.env.SUPER_ADMIN_EMAIL;
  return e ? normalizeEmail(e) : null;
}

function rowToRow(data: Record<string, unknown>): AdminUserRow {
  return {
    ...(data as unknown as AdminUserRow),
    permissions: (data.permissions as Permission[] | null) ?? [],
  };
}

// --- read ---------------------------------------------------------------

export async function getAdminUser(email: string): Promise<AdminUserRow | null> {
  const { data, error } = await supabase()
    .from(TABLE)
    .select("*")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRow(data) : null;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToRow);
}

// Resolve the allowlist row into a principal, applying the env super-admin
// pin and the implicit "admins hold every permission" rule. Returns null when
// the email is not allowed in (no row, revoked, and not the env super-admin).
export async function resolvePrincipal(email: string): Promise<AdminPrincipal | null> {
  const e = normalizeEmail(email);

  if (superAdminEmail() && e === superAdminEmail()) {
    return { email: e, role: "super_admin", permissions: [...EVERY_PERMISSION] };
  }

  const row = await getAdminUser(e);
  if (!row || row.status !== "active") return null;

  const permissions =
    row.role === "staff"
      ? expandPermissions(row.permissions)
      : [...EVERY_PERMISSION];

  return { email: e, role: row.role, permissions };
}

// --- write (used by the access-management actions) ----------------------

export interface GrantInput {
  email: string;
  role: AdminRole;
  permissions: Permission[];
  invitedBy: string;
}

// Create (or re-activate) an allowlist row AND send a Supabase invite email so
// the person can set their password. Idempotent on email.
//
// The allowlist row is written first, so access is granted even if the email
// fails to send (a misconfigured SMTP shouldn't block onboarding — they can
// always be Resent later). Email delivery is reported back rather than thrown.
export async function grantAccess(
  input: GrantInput,
): Promise<{ emailSent: boolean; emailError?: string }> {
  const email = normalizeEmail(input.email);
  const permissions = input.role === "staff" ? expandPermissions(input.permissions) : [];

  const { error } = await supabase()
    .from(TABLE)
    .upsert(
      {
        email,
        role: input.role,
        status: "active",
        permissions,
        invited_by: normalizeEmail(input.invitedBy),
      },
      { onConflict: "email" },
    );
  if (error) throw error;

  try {
    await sendAccessEmail(email);
    return { emailSent: true };
  } catch (e) {
    return { emailSent: false, emailError: e instanceof Error ? e.message : "Email send failed." };
  }
}

export async function updatePermissions(email: string, permissions: Permission[]): Promise<void> {
  const { error } = await supabase()
    .from(TABLE)
    .update({ permissions: expandPermissions(permissions) })
    .eq("email", normalizeEmail(email));
  if (error) throw error;
}

// Fully remove someone's access: delete the allowlist row AND their Supabase
// auth account, so they vanish from the members list and can be re-invited
// cleanly later. The auth-user deletion is best-effort (swallowed on failure)
// since the row deletion alone already blocks all access.
export async function deleteAccess(email: string): Promise<void> {
  const e = normalizeEmail(email);

  const { error } = await supabase().from(TABLE).delete().eq("email", e);
  if (error) throw error;

  try {
    const { data } = await supabaseAuthAdmin().listUsers();
    const user = data?.users.find((u) => (u.email ?? "").toLowerCase() === e);
    if (user) await supabaseAuthAdmin().deleteUser(user.id);
  } catch {
    // Orphan auth user is harmless — login still requires an active row.
  }
}

/** Flip a user's status active ↔ revoked (block / unblock). When blocking we
 *  also bump `signed_out_after` so the live session is killed immediately. */
export async function setUserStatus(email: string, status: "active" | "revoked"): Promise<void> {
  const e = normalizeEmail(email);
  const patch: Record<string, unknown> = { status };
  if (status === "revoked") patch.signed_out_after = new Date().toISOString();
  const { error } = await supabase().from(TABLE).update(patch).eq("email", e);
  if (error) throw error;
}

/** Change a user's role (staff ↔ admin only; super_admin is immutable). When
 *  downgrading from admin to staff, permissions are cleared so the user
 *  starts from zero and the super-admin can re-grant explicitly. */
export async function changeUserRole(email: string, role: AdminRole): Promise<void> {
  const e = normalizeEmail(email);
  if (role === "super_admin") throw new Error("Cannot promote to super_admin via this action.");
  const patch: Record<string, unknown> = {
    role,
    signed_out_after: new Date().toISOString(), // force re-login so the new role takes effect
  };
  if (role === "staff") patch.permissions = [];
  const { error } = await supabase().from(TABLE).update(patch).eq("email", e);
  if (error) throw error;
}

/**
 * Force-logout one user. Sets `signed_out_after` to the current moment so
 * any session cookie issued before now() is treated as expired by
 * currentAdmin() on the user's next request. The user themselves can still
 * log in again with their password — this only invalidates the live session.
 */
export async function forceSignOut(email: string): Promise<void> {
  const { error } = await supabase()
    .from(TABLE)
    .update({ signed_out_after: new Date().toISOString() })
    .eq("email", normalizeEmail(email));
  if (error) throw error;
}

/**
 * Force-logout every admin row whose email is NOT in `keepEmails` (typically
 * the caller themselves). Returns the number of rows affected.
 */
export async function forceSignOutAll(keepEmails: string[]): Promise<number> {
  const keep = keepEmails.map(normalizeEmail);
  let q = supabase().from(TABLE).update({ signed_out_after: new Date().toISOString() }).select("email");
  if (keep.length > 0) q = q.not("email", "in", `(${keep.map((e) => `"${e}"`).join(",")})`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).length;
}

// Re-send an access email. If the auth user hasn't been created yet (or never
// accepted) a fresh invite goes out; if they already exist we fall back to a
// password-reset email — both land on /admin/reset. Returns which was sent.
export async function resendInvite(email: string): Promise<"invite" | "reset"> {
  return sendAccessEmail(normalizeEmail(email));
}

// --- helpers ------------------------------------------------------------

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) || "http://localhost:3000";
}

// The auth.admin namespace requires the service-role key.
function supabaseAuthAdmin() {
  return supabase().auth.admin;
}

const EMAIL_TIMEOUT_MS = 10_000;

// Fail fast if the SMTP server hangs. A correctly configured SMTP returns in
// well under a second; a bad host/port/credential can otherwise block ~30s.
// Note: this doesn't cancel the underlying request, it just stops us waiting.
function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `${label} timed out after ${EMAIL_TIMEOUT_MS / 1000}s — check Supabase SMTP settings (host smtp.gmail.com, port 587, app password).`,
            ),
          ),
        EMAIL_TIMEOUT_MS,
      ),
    ),
  ]);
}

// Send the "set your password" email. Tries an invite first; if the auth user
// already exists, falls back to a password-reset email. Both land on
// /admin/reset. Throws (with a clear message) on SMTP error or timeout.
async function sendAccessEmail(email: string): Promise<"invite" | "reset"> {
  const redirectTo = `${siteUrl()}/admin/reset`;

  const { error } = await withTimeout(
    supabaseAuthAdmin().inviteUserByEmail(email, { redirectTo }),
    "Invite email",
  );
  if (!error) return "invite";

  if (/already.*registered|already been registered|exists/i.test(error.message)) {
    const { error: resetErr } = await withTimeout(
      supabaseAuth().auth.resetPasswordForEmail(email, { redirectTo }),
      "Reset email",
    );
    if (resetErr) throw resetErr;
    return "reset";
  }
  throw error;
}
