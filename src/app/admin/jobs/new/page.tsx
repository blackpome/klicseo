import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminShell from "../../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import JobForm from "../JobForm";

export default async function NewJobPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") redirect("/admin");

  return (
    <AdminShell>
      <div className="space-y-4">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
          <ArrowLeft size={15} /> Jobs
        </Link>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>Add job</h1>
        <JobForm />
      </div>
    </AdminShell>
  );
}
