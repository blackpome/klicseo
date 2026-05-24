import { redirect } from "next/navigation";
import Image from "next/image";
import { isAdmin } from "@/lib/admin-auth";
import LoginForm from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { next, error } = await searchParams;

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-[#050E21]">
      {/* Layered colour wash — premium blue glow top-left, soft gold haze
          bottom-right, faint navy gradient base. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 18% 12%, rgba(26,95,212,0.32) 0%, transparent 60%)," +
            "radial-gradient(ellipse 70% 60% at 82% 88%, rgba(201,168,76,0.20) 0%, transparent 60%)," +
            "linear-gradient(180deg, rgba(7,31,74,0.55) 0%, rgba(5,14,33,0.95) 60%, #050E21 100%)",
        }}
      />

      {/* Subtle grid noise so the gradients don't feel flat. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px, 40px 40px",
          backgroundPosition: "0 0, 20px 20px",
        }}
      />

      {/* Soft outer gold ring behind the card for depth. */}
      <div
        aria-hidden
        className="absolute z-0 w-[460px] h-[460px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)" }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm">
        <div
          className="relative rounded-3xl border border-white/10 px-7 py-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(7,31,74,0.4) 60%, rgba(5,14,33,0.7) 100%)",
          }}
        >
          {/* Gold highlight on the card's top edge */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }}
          />

          {/* Brand mark */}
          <div className="flex flex-col items-center mb-5">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-[#C9A84C]/30 shadow-[0_8px_28px_rgba(201,168,76,0.35)] mb-3">
              <Image src="/Logo.png" alt="Klicseo" fill className="object-cover" sizes="56px" priority />
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C] font-semibold">Klicseo</p>
          </div>

          <h1
            className="text-2xl font-bold text-center mb-1 text-white"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Admin Sign-in
          </h1>
          <p className="text-white/50 text-sm text-center mb-4">Enter your email and password to continue.</p>

          {/* Gold divider — matches the rest of the site. */}
          <div className="flex items-center justify-center mb-5" aria-hidden>
            <div className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, #9C7A2A, #C9A84C, #9C7A2A, transparent)" }} />
          </div>

          <LoginForm next={next ?? "/admin"} error={error} />
        </div>

        {/* Footer below the card */}
        <p className="text-center text-[11px] text-white/30 mt-6">
          Authorised personnel only · Klicseo Admin
        </p>
      </div>
    </div>
  );
}
