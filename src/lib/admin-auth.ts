import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Single-admin auth via HMAC-signed cookie.
// Token format: `<expiry_ms>.<hex_signature>`. Signature is HMAC-SHA256 of the
// expiry string keyed by ADMIN_COOKIE_SECRET — so a leaked cookie can't be
// extended without the secret, and rotating the secret invalidates all sessions.

const COOKIE_NAME = "klicseo-admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function secret(): string {
  const s = process.env.ADMIN_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_COOKIE_SECRET must be set (>=16 chars).");
  }
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function parseToken(token: string | undefined): { expiry: number; valid: boolean } | null {
  if (!token) return null;
  const idx = token.indexOf(".");
  if (idx < 0) return null;
  const expiryStr = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry)) return null;
  const expected = sign(expiryStr);
  if (expected.length !== sig.length) return null;
  const ok = timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  return { expiry, valid: ok && expiry > Date.now() };
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Cookie spec helpers — return the {name,value,options} tuple so the caller
// can attach them directly to a NextResponse. Using `cookies().set(...)` from
// inside an async Route Handler has had quirks across Next versions
// (especially around redirects on mobile Safari); attaching to the response
// object explicitly is the most reliable path.

export interface CookieSpec {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    expires?: Date;
    maxAge?: number;
  };
}

export function buildAdminSessionCookie(): CookieSpec {
  const expiry = Date.now() + SESSION_TTL_MS;
  const token = `${expiry}.${sign(String(expiry))}`;
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiry),
    },
  };
}

export function buildAdminLogoutCookie(): CookieSpec {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

// Kept for backward compat with any callers that need the cookies()-API path
// (e.g. Server Actions or layouts). Route handlers should prefer the build*
// helpers above.
export async function createAdminSession(): Promise<void> {
  const { name, value, options } = buildAdminSessionCookie();
  const jar = await cookies();
  jar.set(name, value, options);
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const parsed = parseToken(jar.get(COOKIE_NAME)?.value);
  return !!parsed?.valid;
}

// Edge-runtime-safe check used by the root proxy (proxy.ts). The proxy can't
// call `cookies()`, but it has access to NextRequest.cookies — so we expose a
// pure-string variant that takes the raw token in.
export function verifyTokenString(token: string | undefined): boolean {
  if (!token) return false;
  // proxy runs on the edge runtime, which doesn't expose node:crypto.
  // To keep the proxy ultra-simple, we just check token *shape* there and
  // re-validate the signature in the server-component layout. This means the
  // proxy is a coarse gate (presence) and the layout is the real auth check.
  return /^\d{10,}\.[0-9a-f]{64}$/.test(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
