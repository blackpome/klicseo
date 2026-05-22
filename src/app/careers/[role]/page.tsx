import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Briefcase, MapPin, IndianRupee } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ApplicationForm from "./ApplicationForm";
import { getJobBySlug } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const job = await getJobBySlug(role);
  if (!job) return { title: "Careers · Klicseo" };
  return {
    title: `${job.title} · Careers · Klicseo`,
    description: job.blurb ?? undefined,
  };
}

export default async function JobPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const job = await getJobBySlug(role);
  if (!job || !job.active) notFound();

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
              {job.title}
            </h1>
            {job.blurb && <p className="text-white/65 leading-relaxed">{job.blurb}</p>}

            {/* Optional meta — only when toggled on and present */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/55">
              {job.show_location && job.location && (
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-[#C9A84C]" /> {job.location}</span>
              )}
              {job.show_salary && job.salary && (
                <span className="inline-flex items-center gap-1.5"><IndianRupee size={14} className="text-[#C9A84C]" /> {job.salary}</span>
              )}
            </div>

            {job.show_description && job.description && (
              <div className="mt-5 text-white/65 leading-relaxed whitespace-pre-line">{job.description}</div>
            )}
          </header>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-[11px] font-bold text-[#C9A84C] uppercase tracking-widest mb-4">
              Apply now
            </h2>
            <ApplicationForm role={job.slug} terms={job.show_terms ? job.terms : null} fields={job.application_fields} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
