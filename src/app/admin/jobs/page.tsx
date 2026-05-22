import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, Plus, Pencil, ExternalLink } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { listJobs, type Job } from "@/lib/jobs";
import DeleteJobButton from "./DeleteJobButton";

export default async function JobsPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">Only admins can manage jobs.</p>
        </div>
      </AdminShell>
    );
  }

  let jobs: Job[] = [];
  let error: unknown = null;
  try {
    jobs = await listJobs();
  } catch (err) {
    error = err;
  }

  return (
    <AdminShell>
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
              <Briefcase className="text-[#C9A84C]" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Careers / Jobs</h1>
              <p className="text-white/45 text-sm">Add, edit, or remove the roles shown on the careers page.</p>
            </div>
          </div>
          <Link
            href="/admin/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#050E21]"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            <Plus size={16} /> Add job
          </Link>
        </div>

        {error ? (
          <AdminError err={error} />
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/40">No jobs yet. Add one.</div>
        ) : (
          <div className="space-y-2.5">
            {jobs.map((j) => (
              <div key={j.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{j.title}</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                      {j.type === "FullTime" ? "Full time" : "Part time"}
                    </span>
                    {j.active ? (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">Active</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/40">Hidden</span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/35 mt-0.5">/careers/{j.slug}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <a href={`/careers/${j.slug}`} target="_blank" rel="noopener noreferrer" title="View" className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10">
                    <ExternalLink size={14} />
                  </a>
                  <Link href={`/admin/jobs/${j.id}/edit`} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10">
                    <Pencil size={14} />
                  </Link>
                  <DeleteJobButton id={j.id} title={j.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
