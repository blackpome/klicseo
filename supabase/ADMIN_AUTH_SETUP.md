# Admin auth setup (multi-user)

The admin panel now uses **Supabase Auth** for credentials + reset/invite
emails, with an `admin_users` allowlist controlling who gets in and what they
can do. Roles: `super_admin`, `admin`, `staff`.

## One-time setup

### 1. Run the migration
Apply `supabase/migrations/0006_admin_users.sql` (Supabase SQL editor or your
migration tool). Creates the `admin_users` table.

### 2. Environment variables
Add to `.env` (see `.env.example`):

| Var | Where to find it |
| --- | --- |
| `SUPABASE_ANON_KEY` | Project Settings → API → `anon` / public key |
| `SUPER_ADMIN_EMAIL` | The owner's email (always treated as super_admin) |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://klicseo.com` — used in email links |

`ADMIN_PASSWORD` is no longer used and can be removed.

### 3. Create the owner account
Supabase dashboard → **Authentication → Users → Add user**. Use the same email
as `SUPER_ADMIN_EMAIL` and set a password. This account can sign in immediately
and can never be locked out (it's pinned by the env var, independent of the
table).

### 4. Configure email links (token_hash flow)
The reset/invite pages verify a one-time `token_hash` server-side, so the email
templates must point at `/admin/reset` with that token.

Dashboard → **Authentication → Email Templates**. Paste the branded HTML from
`supabase/email-templates/` (already wired to the correct token_hash links):

- **Invite user** → paste `email-templates/invite.html`
- **Reset Password** → paste `email-templates/recovery.html`

If you'd rather keep the default templates, just make sure each link uses:
```
{{ .SiteURL }}/admin/reset?token_hash={{ .TokenHash }}&type=invite     (Invite user)
{{ .SiteURL }}/admin/reset?token_hash={{ .TokenHash }}&type=recovery   (Reset Password)
```

Also add `<SITE_URL>/admin/reset` under **Authentication → URL Configuration →
Redirect URLs**, and set **Site URL** to your domain.

> Supabase's built-in email has low rate limits. For production volume, configure
> custom SMTP under Authentication → Emails → SMTP.

## How it works day-to-day

- **Sign in:** email + password at `/admin/login`. We verify against Supabase
  Auth, then require an active `admin_users` row (or the env super_admin).
- **Forgot password:** `/admin/forgot` → emails a reset link (only to allowlisted
  addresses; the response is always generic).
- **Grant access:** `/admin/access` → super_admin can create **admins** and
  **staff**; admins can create **staff** only. Granting sends a Supabase invite
  email so the person sets their own password.
- **Resend:** each active member has a **Resend** button — sends a fresh invite,
  or (if the account already exists) a password-reset email. Both land on
  `/admin/reset`.
- **Permissions (staff only):** `leads.view`, `leads.manage`, `employees.view`,
  `employees.manage`. "Manage" implies "view". Admins/super_admins hold all.
- **Revoke:** flip status to revoked on `/admin/access` — the user is rejected on
  their next request (session is re-checked against the allowlist every request).
