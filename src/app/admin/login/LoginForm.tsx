// Server component on purpose — plain HTML form POST is the most reliable
// auth path across mobile browsers (no JS state, no fetch, no client router).

export default function LoginForm({ next, error }: { next: string; error?: string }) {
  return (
    <form method="POST" action="/api/admin/login" className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        placeholder="Password"
        autoFocus
        required
        autoComplete="current-password"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30"
      />
      {error && <p className="text-[12px] text-red-300">{error}</p>}
      <button
        type="submit"
        className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21]"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        Sign in
      </button>
    </form>
  );
}
