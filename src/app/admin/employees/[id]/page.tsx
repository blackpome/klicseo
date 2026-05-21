import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  User,
  Briefcase,
  Calendar,
  IndianRupee,
  FileText,
  Pencil,
  ImageIcon,
} from "lucide-react";
import AdminShell from "../../AdminShell";
import AdminError from "../../AdminError";
import EmployeeStatusControl from "../EmployeeStatusControl";
import DeleteEmployeeButton from "./DeleteEmployeeButton";
import {
  getEmployee,
  jobByRole,
  signedUrlFor,
  type EmployeeStatus,
} from "@/lib/employees";

const STATUS_COLOR: Record<EmployeeStatus, string> = {
  applied: "#3B82F6",
  screening: "#C9A84C",
  hired: "#8B5CF6",
  active: "#10b981",
  resigned: "#94a3b8",
  rejected: "#EF4444",
};

function fmt(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="border-b border-white/5 py-2.5">
      <div className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="flex items-center gap-2 text-[11px] font-bold text-[#C9A84C] uppercase tracking-widest mb-2">
        <Icon size={12} /> {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let emp;
  try {
    emp = await getEmployee(id);
  } catch (err) {
    return (
      <AdminShell require="employees.view">
        <AdminError err={err} />
      </AdminShell>
    );
  }
  if (!emp) notFound();

  const [aadhaarUrl, profileUrl, signatureUrl] = await Promise.all([
    signedUrlFor(emp.aadhaar_photo_path).catch(() => null),
    signedUrlFor(emp.profile_photo_path).catch(() => null),
    signedUrlFor(emp.signature_path).catch(() => null),
  ]);

  const job = jobByRole(emp.job_role);

  return (
    <AdminShell require="employees.view">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <Link href="/admin/employees" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft size={13} /> All employees
        </Link>
        <div className="flex items-center gap-3">
          <EmployeeStatusControl id={emp.id} status={emp.status} color={STATUS_COLOR[emp.status]} />
          <Link
            href={`/admin/employees/${emp.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/15 text-white/80 hover:text-white hover:border-white/30"
          >
            <Pencil size={12} /> Edit
          </Link>
          <DeleteEmployeeButton id={emp.id} />
        </div>
      </div>

      <header className="mb-6 flex items-start gap-4 flex-wrap">
        {profileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileUrl}
            alt={`${emp.name} profile`}
            className="w-20 h-20 rounded-full object-cover border border-white/15"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/30">
            <User size={28} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            {emp.name}
          </h1>
          <p className="text-white/50 text-sm mt-1 flex items-center gap-3 flex-wrap">
            <a href={`tel:${emp.phone}`} className="text-[#C9A84C] hover:underline inline-flex items-center gap-1">
              <Phone size={12} /> {emp.phone}
            </a>
            <span className="text-white/30">·</span>
            <span>{job?.label ?? emp.job_role}</span>
            <span className="text-white/30">·</span>
            <span>
              Applied{" "}
              {new Date(emp.created_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Role" icon={Briefcase}>
          <Field label="Job role" value={job?.label ?? emp.job_role} />
          <Field label="Type" value={job?.type === "FullTime" ? "Full time" : job?.type === "PartTime" ? "Part time" : "—"} />
        </Section>

        <Section title="Contact" icon={User}>
          <Field label="Name" value={fmt(emp.name)} />
          <Field
            label="Phone"
            value={
              <a href={`tel:${emp.phone}`} className="text-[#C9A84C] hover:underline">{emp.phone}</a>
            }
          />
        </Section>

        <Section title="Address" icon={MapPin}>
          <Field label="Location" value={fmt(emp.location)} />
        </Section>

        <Section title="ID & documents" icon={FileText}>
          <Field label="Aadhaar number" value={fmt(emp.aadhaar_number)} mono />
          <Field
            label="Aadhaar photo"
            value={
              aadhaarUrl ? (
                <a href={aadhaarUrl} target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] hover:underline inline-flex items-center gap-1">
                  <ImageIcon size={12} /> Open file ↗
                </a>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Signature"
            value={
              signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureUrl} alt="Signature" className="mt-1 max-h-24 bg-white/5 rounded border border-white/10 p-1" />
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Terms accepted"
            value={
              emp.terms_accepted_at
                ? new Date(emp.terms_accepted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                : "—"
            }
          />
        </Section>

        <Section title="Compensation" icon={IndianRupee}>
          <Field
            label="Salary (per month)"
            value={emp.salary != null ? `₹${emp.salary.toLocaleString("en-IN")}` : "—"}
          />
        </Section>

        <Section title="Schedule" icon={Calendar}>
          <Field label="Reminder call date" value={fmt(emp.reminder_call_date)} />
          <Field label="Joining date" value={fmt(emp.joining_date)} />
          <Field label="Resignation date" value={fmt(emp.resignation_date)} />
        </Section>

        <div className="lg:col-span-2">
          <Section title="Internal notes" icon={FileText}>
            <div className="text-sm text-white/85 whitespace-pre-line py-1">
              {emp.notes ? emp.notes : <span className="text-white/40">—</span>}
            </div>
          </Section>
        </div>
      </div>
    </AdminShell>
  );
}
