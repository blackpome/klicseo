import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-auth";

// Lightweight session probe. Each admin page polls this to detect a forced
// sign-out from another tab/device — when the cookie is no longer valid the
// route returns 401 and the client redirects to /admin/login.

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { ok: true, email: me.email, role: me.role },
    { headers: { "Cache-Control": "no-store" } },
  );
}
