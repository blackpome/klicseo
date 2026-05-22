"use client";

import { useActionState, useState } from "react";
import { User, Briefcase, MapPin, Calendar, IndianRupee, FileText, Loader2 } from "lucide-react";
import { type EmployeeRow } from "@/lib/employees-shared";

interface JobOption { slug: string; title: string; type: "PartTime" | "FullTime" }
import { attachCompressedFileTo, type CompressOptions } from "@/lib/compress-image";

const COMPRESS_AADHAAR: CompressOptions = { maxDim: 2000, quality: 0.85 };
const COMPRESS_PROFILE: CompressOptions = { maxDim: 1200, quality: 0.8 };

const fieldCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]";

const labelCls = "text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1 block";

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
      <h2 className="flex items-center gap-2 text-[11px] font-bold text-[#C9A84C] uppercase tracking-widest mb-3">
        <Icon size={12} /> {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

type State = { error?: string };
type Action = (state: State, formData: FormData) => Promise<State>;

export default function EmployeeForm({
  action,
  initial,
  submitLabel,
  pendingLabel,
  hiddenId,
  jobs,
}: {
  action: Action;
  initial?: Partial<EmployeeRow> | null;
  submitLabel: string;
  pendingLabel: string;
  hiddenId?: string;
  jobs: JobOption[];
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, {});
  const [compressing, setCompressing] = useState<Record<string, boolean>>({});

  const v = (k: keyof EmployeeRow) => (initial?.[k] as string | number | null | undefined) ?? "";

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    opts: CompressOptions,
  ) {
    setCompressing((m) => ({ ...m, [key]: true }));
    try {
      await attachCompressedFileTo(e.currentTarget, opts);
    } finally {
      setCompressing((m) => ({ ...m, [key]: false }));
    }
  }

  const compressBusy = Object.values(compressing).some(Boolean);
  const busy = pending || compressBusy;

  return (
    <form action={formAction} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {hiddenId && <input type="hidden" name="id" value={hiddenId} />}

      <Section title="Role" icon={Briefcase}>
        <Field label="Job role">
          <select
            name="job_role"
            required
            defaultValue={(initial?.job_role as string) ?? ""}
            className={fieldCls}
          >
            <option value="">— Select role —</option>
            {jobs.map((j) => (
              <option key={j.slug} value={j.slug}>
                {j.title} ({j.type === "FullTime" ? "Full time" : "Part time"})
              </option>
            ))}
            {/* Keep an existing role selectable even if its job was removed/renamed */}
            {initial?.job_role && !jobs.some((j) => j.slug === initial.job_role) && (
              <option value={initial.job_role as string}>{initial.job_role as string}</option>
            )}
          </select>
        </Field>
      </Section>

      <Section title="Contact" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name *">
            <input name="name" required defaultValue={v("name") as string} className={fieldCls} />
          </Field>
          <Field label="Phone *">
            <input name="phone" required inputMode="tel" defaultValue={v("phone") as string} className={fieldCls} />
          </Field>
        </div>
      </Section>

      <Section title="Address" icon={MapPin}>
        <Field label="Location">
          <input name="location" placeholder="Area, city" defaultValue={v("location") as string} className={fieldCls} />
        </Field>
      </Section>

      <Section title="ID & documents" icon={FileText}>
        <Field label="Aadhaar number">
          <input
            name="aadhaar_number"
            inputMode="numeric"
            maxLength={14}
            defaultValue={v("aadhaar_number") as string}
            className={`${fieldCls} font-mono`}
          />
        </Field>
        <Field
          label={`${initial?.aadhaar_photo_path ? "Replace Aadhaar photo" : "Aadhaar photo"}${
            compressing.aadhaar ? " · compressing…" : ""
          }`}
        >
          <input
            type="file"
            name="aadhaar_photo"
            accept="image/*,application/pdf"
            onChange={(e) => handleFileChange(e, "aadhaar", COMPRESS_AADHAAR)}
            className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
          />
        </Field>
        <Field
          label={`${initial?.profile_photo_path ? "Replace profile photo" : "Profile photo"}${
            compressing.profile ? " · compressing…" : ""
          }`}
        >
          <input
            type="file"
            name="profile_photo"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "profile", COMPRESS_PROFILE)}
            className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
          />
        </Field>
      </Section>

      <Section title="Compensation" icon={IndianRupee}>
        <Field label="Salary (₹ per month)">
          <input
            name="salary"
            type="number"
            min={0}
            defaultValue={initial?.salary != null ? String(initial.salary) : ""}
            className={fieldCls}
          />
        </Field>
      </Section>

      <Section title="Schedule" icon={Calendar}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Reminder call">
            <input
              type="date"
              name="reminder_call_date"
              defaultValue={v("reminder_call_date") as string}
              className={`${fieldCls} [color-scheme:dark]`}
            />
          </Field>
          <Field label="Joining date">
            <input
              type="date"
              name="joining_date"
              defaultValue={v("joining_date") as string}
              className={`${fieldCls} [color-scheme:dark]`}
            />
          </Field>
          <Field label="Resignation date">
            <input
              type="date"
              name="resignation_date"
              defaultValue={v("resignation_date") as string}
              className={`${fieldCls} [color-scheme:dark]`}
            />
          </Field>
        </div>
      </Section>

      <div className="lg:col-span-2">
        <Section title="Notes" icon={FileText}>
          <Field label="Internal notes">
            <textarea name="notes" rows={3} defaultValue={v("notes") as string} className={`${fieldCls} resize-none`} />
          </Field>
        </Section>
      </div>

      <div className="lg:col-span-2 space-y-3">
        {state.error && <p className="text-[12px] text-red-300">{state.error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60 inline-flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {compressBusy && <Loader2 size={14} className="animate-spin" />}
          {pending ? pendingLabel : compressBusy ? "Preparing photos…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
