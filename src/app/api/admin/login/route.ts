import { NextResponse } from "next/server";
import { buildAdminSessionCookie, isAdmin, verifyCredentials } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

// Receives a plain HTML form POST from /admin/login. Returns 303 + Set-Cookie
// + Location — a single atomic response the browser handles natively. This
// avoids every cookie/redirect race that bit mobile Safari + Server Actions.

function safeNext(raw: string): string {
  // Only allow same-origin admin paths; reject open redirects.
  return raw.startsWith("/admin") && !raw.startsWith("//") ? raw : "/admin";
}

function loginRedirect(req: Request, params: { error?: string; next: string }) {
  const url = new URL("/admin/login", req.url);
  url.searchParams.set("next", params.next);
  if (params.error) url.searchParams.set("error", params.error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return loginRedirect(req, { error: "Invalid form submission.", next: "/admin" });
  }

  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? "/admin"));

  // Already logged in? Just go.
  if (await isAdmin()) {
    return NextResponse.redirect(new URL(next, req.url), { status: 303 });
  }

  const principal = await verifyCredentials(email, password);
  if (!principal) {
    // Tiny artificial delay so response-time doesn't leak whether the email was
    // unknown vs. password wrong vs. access revoked. One generic message for all.
    await new Promise((r) => setTimeout(r, 200));
    return loginRedirect(req, { error: "Incorrect email or password, or access not granted.", next });
  }

  // Build the cookie and attach it to the redirect response itself. This is
  // the critical bit: Set-Cookie + Location ship in the same 303, and the
  // browser commits the cookie before following the Location.
  const { name, value, options } = buildAdminSessionCookie(principal.email);
  const response = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  response.cookies.set(name, value, options);
  await logAudit("auth.login", { entity: "auth", actorEmail: principal.email, actorRole: principal.role, summary: "Signed in" });
  return response;
}
