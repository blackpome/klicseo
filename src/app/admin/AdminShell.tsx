import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";

// Wraps authed admin pages with nav chrome + real HMAC signature check.
// Login page deliberately does NOT use this — it renders bare.
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const ok = await isAdmin();
  if (!ok) redirect("/admin/login");

  return (
    <>
      <header className="border-b border-white/10 bg-[#071F4A]/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/admin"
            className="text-sm font-bold tracking-widest uppercase"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Klicseo · Admin
          </Link>
          <nav className="flex items-center gap-4 text-xs">
            <Link href="/admin" className="text-white/70 hover:text-white">Leads</Link>
            <Link href="/admin/new" className="text-white/70 hover:text-white">+ Add Lead</Link>
            <form action="/api/admin/logout" method="post">
              <button className="text-white/60 hover:text-red-300" type="submit">Logout</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
