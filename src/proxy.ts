import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Coarse gate for /admin/*. The proxy runs on the edge runtime, where
// node:crypto is unavailable — so it only checks that the cookie *exists* and
// has the right shape. The real HMAC signature check happens server-side in
// src/app/admin/layout.tsx via `isAdmin()` before rendering anything sensitive.

const COOKIE_NAME = "klicseo-admin";
const TOKEN_SHAPE = /^\d{10,}\.[0-9a-f]{64}$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public sub-paths under /admin
  if (pathname === "/admin/login") return NextResponse.next();

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
