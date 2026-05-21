import Link from "next/link";

// Bare page (not wrapped in AdminShell) — public, no session required.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Reset password
        </h1>
        {sent ? (
          <p className="text-white/55 text-sm mb-6">
            If that email has admin access, we’ve sent a reset link. Check your inbox.
          </p>
        ) : (
          <>
            <p className="text-white/45 text-sm mb-6">
              Enter your email and we’ll send you a link to set a new password.
            </p>
            <form method="POST" action="/api/admin/forgot" className="space-y-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                autoFocus
                required
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30"
              />
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21]"
                style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
              >
                Send reset link
              </button>
            </form>
          </>
        )}
        <p className="text-center text-[12px] text-white/40 pt-4">
          <Link href="/admin/login" className="hover:text-[#C9A84C] hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
