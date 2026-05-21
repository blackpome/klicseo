import { NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { getAdminUser, normalizeEmail } from "@/lib/admin-users";

// Sends a Supabase password-reset email — but only to emails that actually
// hold admin access, so the panel never emails strangers. The response is
// always the same generic "if that email has access…" page regardless, so an
// attacker can't probe which emails are admins.

function siteUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return env || new URL(req.url).origin;
}

export async function POST(req: Request) {
  let email = "";
  try {
    const form = await req.formData();
    email = normalizeEmail(String(form.get("email") ?? ""));
  } catch {
    // fall through to generic response
  }

  if (email) {
    try {
      const row = await getAdminUser(email);
      const isEnvSuper =
        process.env.SUPER_ADMIN_EMAIL &&
        normalizeEmail(process.env.SUPER_ADMIN_EMAIL) === email;
      if ((row && row.status === "active") || isEnvSuper) {
        await supabaseAuth().auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl(req)}/admin/reset`,
        });
      }
    } catch {
      // Swallow — never reveal whether the email exists or sending failed.
    }
  }

  return NextResponse.redirect(new URL("/admin/forgot?sent=1", req.url), { status: 303 });
}
