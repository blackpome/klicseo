import { redirect } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Admin Login
        </h1>
        <p className="text-white/45 text-sm mb-6">Enter your email and password to continue.</p>
        <LoginForm next={next ?? "/admin"} error={error} />
      </div>
    </div>
  );
}
