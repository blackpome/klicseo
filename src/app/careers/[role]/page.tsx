import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Briefcase } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ApplicationForm from "./ApplicationForm";
import { JOB_CATALOG, jobByRole } from "@/lib/employees";

export function generateStaticParams() {
  return JOB_CATALOG.map((j) => ({ role: j.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const job = jobByRole(role);
  if (!job) return { title: "Careers · Klicseo" };
  return {
    title: `${job.label} · Careers · Klicseo`,
    description: job.blurb,
  };
}

export default async function JobPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const job = jobByRole(role);
  if (!job) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#050E21] text-white pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white mb-6"
          >
            <ArrowLeft size={13} /> All roles
          </Link>

          <header className="mb-8">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-white/40 mb-3">
              {job.type === "FullTime" ? <Briefcase size={11} /> : <Clock size={11} />}
              {job.type === "FullTime" ? "Full time" : "Part time"}
            </div>
            <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
              {job.label}
            </h1>
            <p className="text-white/65 leading-relaxed">{job.blurb}</p>
          </header>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-[11px] font-bold text-[#C9A84C] uppercase tracking-widest mb-4">
              Apply now
            </h2>
            <ApplicationForm role={job.id} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
