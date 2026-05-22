import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminShell from "../../../AdminShell";
import AdminError from "../../../AdminError";
import EmployeeForm from "../../EmployeeForm";
import { updateEmployeeAction } from "../../actions";
import { getEmployee } from "@/lib/employees";
import { listJobs } from "@/lib/jobs";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let employee;
  try {
    employee = await getEmployee(id);
  } catch (err) {
    return (
      <AdminShell require="employees.manage">
        <AdminError err={err} />
      </AdminShell>
    );
  }
  if (!employee) notFound();

  const jobs = await listJobs();

  return (
    <AdminShell require="employees.manage">
      <div className="max-w-5xl">
        <Link
          href={`/admin/employees/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft size={13} /> Back to employee
        </Link>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Edit Employee
        </h1>
        <p className="text-white/45 text-sm mb-6">Update details, schedule, and compensation.</p>
        <EmployeeForm
          action={updateEmployeeAction}
          initial={employee}
          hiddenId={employee.id}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          jobs={jobs}
        />
      </div>
    </AdminShell>
  );
}
