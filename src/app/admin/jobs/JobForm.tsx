"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createJobAction, updateJobAction } from "./actions";
import { APP_FIELD_DEFS, APP_FIELD_DEFAULTS, type Job } from "@/lib/jobs-shared";

const input = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]";
const label = "text-[11px] uppercase tracking-wider text-white/45";

function Toggle({ name, defaultOn, label: lbl }: { name: string; defaultOn: boolean; label: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <label className="flex items-center gap-2 text-[12px] text-white/60 cursor-pointer">
      <input type="hidden" name={name} value={on ? "on" : "off"} />
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[#10b981]" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {lbl}
    </label>
  );
}

// A text/textarea field paired with a "show on job page" toggle.
function FieldWithToggle({
  name,
  title,
  defaultValue,
  showName,
  showDefault,
  textarea,
}: {
  name: string;
  title: string;
  defaultValue: string;
  showName: string;
  showDefault: boolean;
  textarea?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={label}>{title}</span>
        <Toggle name={showName} defaultOn={showDefault} label="Show on page" />
      </div>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} rows={4} className={input} />
      ) : (
        <input name={name} defaultValue={defaultValue} className={input} />
      )}
    </div>
  );
}

export default function JobForm({ job }: { job?: Job }) {
  const editing = !!job;
  const [state, action, pending] = useActionState(editing ? updateJobAction : createJobAction, {} as { error?: string });

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      {editing && <input type="hidden" name="id" value={job.id} />}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className={label}>Title</span>
            <input name="title" required defaultValue={job?.title ?? ""} className={`mt-1 ${input}`} />
          </label>
          <label className="block">
            <span className={label}>Type</span>
            <select name="type" defaultValue={job?.type ?? "PartTime"} className={`mt-1 ${input}`}>
              <option value="PartTime">Part time</option>
              <option value="FullTime">Full time</option>
            </select>
          </label>
          <label className="block">
            <span className={label}>Sort order</span>
            <input type="text" inputMode="numeric" name="sort_order" defaultValue={job?.sort_order ?? 0} className={`mt-1 ${input}`} />
          </label>
        </div>

        <label className="block">
          <span className={label}>Short blurb (listing card)</span>
          <textarea name="blurb" defaultValue={job?.blurb ?? ""} rows={2} className={`mt-1 ${input}`} />
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <FieldWithToggle name="description" title="Description" defaultValue={job?.description ?? ""} showName="show_description" showDefault={job?.show_description ?? true} textarea />
        <FieldWithToggle name="location" title="Location" defaultValue={job?.location ?? ""} showName="show_location" showDefault={job?.show_location ?? false} />
        <FieldWithToggle name="salary" title="Salary range" defaultValue={job?.salary ?? ""} showName="show_salary" showDefault={job?.show_salary ?? false} />
        <FieldWithToggle name="terms" title="Terms & conditions (Markdown supported)" defaultValue={job?.terms ?? ""} showName="show_terms" showDefault={job?.show_terms ?? true} textarea />
      </div>

      {/* Application form fields */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Application form</h2>
          <p className="text-[11px] text-white/35">Choose which fields applicants see and which are required. Name &amp; phone are always collected.</p>
        </div>
        <div className="space-y-2">
          <div className="hidden sm:flex items-center text-[10px] uppercase tracking-wider text-white/30 px-1">
            <span className="flex-1">Field</span>
            <span className="w-24 text-center">Show</span>
            <span className="w-24 text-center">Required</span>
          </div>
          {APP_FIELD_DEFS.map((def) => {
            const cfg = job?.application_fields?.[def.key] ?? APP_FIELD_DEFAULTS[def.key];
            return (
              <div key={def.key} className="flex items-center gap-2 flex-wrap border-t border-white/5 pt-2">
                <span className="flex-1 min-w-[120px] text-sm text-white/80">{def.label}</span>
                <div className="w-24 flex justify-center">
                  <Toggle name={`af_${def.key}_enabled`} defaultOn={cfg.enabled} label="" />
                </div>
                <div className="w-24 flex justify-center">
                  <Toggle name={`af_${def.key}_required`} defaultOn={cfg.required} label="" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <Toggle name="active" defaultOn={job?.active ?? true} label="Active — show this job on the careers page" />
      </div>

      {state.error && <p className="text-[12px] text-red-300">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {pending ? "Saving…" : editing ? "Save job" : "Add job"}
        </button>
        <Link href="/admin/jobs" className="text-sm text-white/50 hover:text-white">Cancel</Link>
      </div>
    </form>
  );
}
