import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAuth } from "@/lib/supabase-auth";
import { buildAdminSessionCookie } from "@/lib/admin-auth";
import { resolvePrincipal } from "@/lib/admin-users";

// Completes a recovery/invite. We hold off verifying the one-time token until
// here: verifyOtp() consumes the token AND establishes a session on this
// client instance, then we updateUser() the new password on that same client.
//
// On success, if the user is allowlisted we mint our own admin session cookie
// so they land straight in the panel; otherwise we send them to the login page.

function back(req: Request, params: { token_hash?: string; type?: string; error: string }) {
  const url = new URL("/admin/reset", req.url);
  if (params.token_hash) url.searchParams.set("token_hash", params.token_hash);
  if (params.type) url.searchParams.set("type", params.type);
  url.searchParams.set("error", params.error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back(req, { error: "Invalid form submission." });
  }

  const token_hash = String(form.get("token_hash") ?? "");
  const type = (String(form.get("type") ?? "recovery") === "invite" ? "invite" : "recovery") as EmailOtpType;
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!token_hash) return back(req, { error: "This link is invalid or has expired." });
  if (password.length < 8) return back(req, { token_hash, type, error: "Password must be at least 8 characters." });
  if (password !== confirm) return back(req, { token_hash, type, error: "Passwords don’t match." });

  const client = supabaseAuth();

  const { data: verified, error: verifyErr } = await client.auth.verifyOtp({ token_hash, type });
  if (verifyErr || !verified.user) {
    return back(req, { error: "This link is invalid or has expired. Request a new one." });
  }

  const { error: updateErr } = await client.auth.updateUser({ password });
  if (updateErr) {
    return back(req, { token_hash, type, error: "Couldn’t save that password. Please try again." });
  }

  const email = verified.user.email ?? "";
  const principal = email ? await resolvePrincipal(email) : null;

  // Allowlisted → straight into the panel with a fresh session. Not allowlisted
  // (password set but access not granted yet) → login page with a notice.
  if (principal) {
    const { name, value, options } = buildAdminSessionCookie(principal.email);
    const res = NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
    res.cookies.set(name, value, options);
    return res;
  }

  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
