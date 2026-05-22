import AdminShell from "../../AdminShell";
import EmployeeForm from "../EmployeeForm";
import { createEmployeeAction } from "../actions";
import { listJobs } from "@/lib/jobs";

export default async function NewEmployeePage() {
  const jobs = await listJobs();
  return (
    <AdminShell require="employees.manage">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Add Employee
        </h1>
        <p className="text-white/45 text-sm mb-6">Manually create a record for someone who didn&apos;t apply online.</p>
        <EmployeeForm action={createEmployeeAction} submitLabel="Save employee" pendingLabel="Saving…" jobs={jobs} />
      </div>
    </AdminShell>
  );
}
