import { NextResponse } from "next/server";
import { buildAdminLogoutCookie } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  await logAudit("auth.logout", { entity: "auth", summary: "Signed out" });
  const { name, value, options } = buildAdminLogoutCookie();
  const response = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  response.cookies.set(name, value, options);
  return response;
}
