import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Coarse gate for /admin/*. The proxy runs on the edge runtime, where
// node:crypto is unavailable — so it only checks that the cookie *exists* and
// has the right shape. The real HMAC signature check happens server-side in
// src/app/admin/layout.tsx via `isAdmin()` before rendering anything sensitive.

const COOKIE_NAME = "klicseo-admin";
// `<expiry>.<email_b64url>.<hex_sig>` — see lib/admin-auth.ts. Coarse shape
// check only; the signature + allowlist are verified server-side.
const TOKEN_SHAPE = /^\d{10,}\.[A-Za-z0-9_-]+\.[0-9a-f]{64}$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public sub-paths under /admin (login + password-recovery flows)
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/forgot" ||
    pathname === "/admin/reset"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token || !TOKEN_SHAPE.test(token)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
