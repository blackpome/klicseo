import Link from "next/link";
import ResetForm from "./ResetForm";

// Landing page for Supabase recovery + invite emails. The email link points
// here with `?token_hash=…&type=recovery|invite` (see email-template config in
// the setup notes). We DON'T verify the token here — verifyOtp consumes it
// one-time, so we defer that to the POST handler at submit. This page just
// renders the "set a new password" form carrying the token forward.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; error?: string }>;
}) {
  const { token_hash, type, error } = await searchParams;
  const validType = type === "invite" ? "invite" : "recovery";
  const missing = !token_hash;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          {validType === "invite" ? "Set your password" : "New password"}
        </h1>

        {missing ? (
          <p className="text-white/55 text-sm mb-6">
            This link is invalid or has expired. Request a new one from the{" "}
            <Link href="/admin/forgot" className="text-[#C9A84C] hover:underline">
              reset page
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="text-white/45 text-sm mb-6">
              Choose a password to access the admin panel.
            </p>
            <ResetForm tokenHash={token_hash} type={validType} serverError={error} />
          </>
        )}
      </div>
    </div>
  );
}
