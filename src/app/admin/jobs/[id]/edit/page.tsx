import { notFound, redirect } from "next/navigation";
import AdminShell from "../../../AdminShell";
import AdminBackButton from "@/components/AdminBackButton";
import { currentAdmin } from "@/lib/admin-auth";
import { getJob } from "@/lib/jobs";
import JobForm from "../../JobForm";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") redirect("/admin");

  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <AdminShell>
      <div className="space-y-4">
        <AdminBackButton fallbackHref="/admin/jobs" label="Back to jobs" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white" iconSize={15} />
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>{job.title}</h1>
        <JobForm job={job} />
      </div>
    </AdminShell>
  );
}
