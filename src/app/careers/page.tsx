import Link from "next/link";
import { listJobs, type Job } from "@/lib/jobs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbsJsonLd from "@/components/BreadcrumbsJsonLd";
import { ArrowRight, Clock, Briefcase } from "lucide-react";

export const metadata = {
  title: "Careers · Klicseo",
  description: "Join the Klicseo team — part-time and full-time roles across operations, field marketing, and back office.",
};

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  let jobs: Job[] = [];
  try {
    jobs = await listJobs({ activeOnly: true });
  } catch {
    jobs = [];
  }

  return (
    <>
      <BreadcrumbsJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Careers", path: "/careers" },
        ]}
      />
      <Navbar />
      <main className="min-h-screen bg-[#050E21] text-white pt-28 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <header className="text-center mb-12">
            <p className="text-[11px] font-bold tracking-[0.3em] text-[#C9A84C] uppercase mb-3">We&apos;re hiring</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
              Build Klicseo with us
            </h1>
            <p className="text-white/60 max-w-xl mx-auto">
              Open roles across operations, field marketing, and back office. Apply in under five minutes.
            </p>
          </header>

          {jobs.length === 0 ? (
            <p className="text-center text-white/40">No open roles right now — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.slug}`}
                  className="group relative block rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#C9A84C]/50 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-white/40 mb-3">
                    {job.type === "FullTime" ? <Briefcase size={11} /> : <Clock size={11} />}
                    {job.type === "FullTime" ? "Full time" : "Part time"}
                  </div>
                  <h2 className="text-xl font-bold mb-2 group-hover:text-[#C9A84C] transition-colors">
                    {job.title}
                  </h2>
                  {job.blurb && <p className="text-white/55 text-sm leading-relaxed mb-5">{job.blurb}</p>}
                  <span className="inline-flex items-center gap-1.5 text-[#C9A84C] text-sm font-semibold">
                    Apply <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
