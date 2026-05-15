export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Admin pages are per-request and never safe to cache — mobile Safari is
// especially aggressive about back/forward cache (bfcache), which can show a
// stale logged-in render after logout (or vice-versa).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#050E21] text-white">{children}</div>;
}
