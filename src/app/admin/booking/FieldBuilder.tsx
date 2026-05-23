"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { CUSTOM_FIELD_TYPES, type CustomField, type CustomFieldType } from "@/lib/site-settings-shared";

function newField(): CustomField {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `f_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    label: "",
    type: "text",
    required: false,
    enabled: true,
    options: [],
    placeholder: "",
  };
}

const input = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]";

// Manages a step's custom fields locally and serializes them into a hidden
// input (JSON) so they submit with the parent booking form.
export default function FieldBuilder({ stepKey, initial }: { stepKey: string; initial: CustomField[] }) {
  const [fields, setFields] = useState<CustomField[]>(initial);

  const patch = (id: string, p: Partial<CustomField>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const remove = (id: string) => setFields((fs) => fs.filter((f) => f.id !== id));

  return (
    <div className="space-y-3">
      <input type="hidden" name={`step_${stepKey}_fields`} value={JSON.stringify(fields)} />

      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-white/45">Custom fields</span>
        <button
          type="button"
          onClick={() => setFields((fs) => [...fs, newField()])}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/15"
        >
          <Plus size={13} /> Add field
        </button>
      </div>

      {fields.length === 0 && <p className="text-[11px] text-white/30">No custom fields on this step yet.</p>}

      {fields.map((f) => (
        <div key={f.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-white/20 shrink-0" />
            <input
              value={f.label}
              placeholder="Field label (e.g. Preferred brand)"
              onChange={(e) => patch(f.id, { label: e.target.value })}
              className={`${input} flex-1`}
            />
            <button type="button" onClick={() => remove(f.id)} title="Remove" className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap pl-6">
            <select value={f.type} onChange={(e) => patch(f.id, { type: e.target.value as CustomFieldType })} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]">
              {CUSTOM_FIELD_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-[#050E21]">{t.label}</option>)}
            </select>

            <label className="flex items-center gap-1.5 text-[11px] text-white/55">
              <input type="checkbox" checked={f.required} onChange={(e) => patch(f.id, { required: e.target.checked })} className="accent-[#C9A84C]" /> Required
            </label>

            {/* enabled toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={f.enabled}
              onClick={() => patch(f.id, { enabled: !f.enabled })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${f.enabled ? "bg-[#10b981]" : "bg-white/15"}`}
              title={f.enabled ? "Shown" : "Hidden"}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${f.enabled ? "left-[18px]" : "left-0.5"}`} />
            </button>
            <span className="text-[11px] text-white/40">{f.enabled ? "Shown" : "Hidden"}</span>
          </div>

          {f.type === "select" && (
            <input
              value={f.options.join(", ")}
              placeholder="Options, comma-separated"
              onChange={(e) => patch(f.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className={`${input} ml-6 w-[calc(100%-1.5rem)]`}
            />
          )}
          {(f.type === "text" || f.type === "textarea" || f.type === "number") && (
            <input
              value={f.placeholder}
              placeholder="Placeholder (optional)"
              onChange={(e) => patch(f.id, { placeholder: e.target.value })}
              className={`${input} ml-6 w-[calc(100%-1.5rem)]`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
