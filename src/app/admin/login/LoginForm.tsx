// Server component on purpose — plain HTML form POST is the most reliable
// auth path across mobile browsers (no JS state, no fetch, no client router).
import Link from "next/link";
import { Mail, Lock, AlertCircle } from "lucide-react";

const inputBase =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/30 text-sm " +
  "focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 focus:bg-white/[0.06] transition-colors";

export default function LoginForm({ next, error }: { next: string; error?: string }) {
  return (
    <form method="POST" action="/api/admin/login" className="space-y-3">
      <input type="hidden" name="next" value={next} />

      <div className="relative">
        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          type="email"
          name="email"
          placeholder="Email"
          autoFocus
          required
          autoComplete="username"
          className={inputBase}
        />
      </div>

      <div className="relative">
        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          className={inputBase}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/[0.08] p-2.5">
          <AlertCircle size={13} className="text-red-300 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-200 leading-snug">{error}</p>
        </div>
      )}

      <button
        type="submit"
        className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21] shadow-[0_8px_24px_-8px_rgba(201,168,76,0.7)] hover:shadow-[0_12px_28px_-6px_rgba(201,168,76,0.9)] hover:brightness-105 active:scale-[0.99] transition-all"
        style={{ background: "linear-gradient(135deg,#9C7A2A 0%,#C9A84C 50%,#E8CC7A 100%)" }}
      >
        Sign in
      </button>
      <p className="text-center text-[12px] text-white/45 pt-1">
        <Link href="/admin/forgot" className="hover:text-[#C9A84C] hover:underline transition-colors">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
