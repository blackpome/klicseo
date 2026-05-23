"use client";

import type { BookingData } from "./BookingWizard";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import { stepFields, type BookingStepKey } from "@/lib/site-settings-shared";

const fieldCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C]";
const labelCls = "block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2";

// Renders the admin-defined custom fields for a wizard step and binds them to
// data.customFields. Returns null when the step has no enabled custom fields.
export default function CustomFields({
  stepKey,
  data,
  update,
}: {
  stepKey: BookingStepKey;
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
}) {
  const fields = stepFields(useSiteSettings().booking, stepKey);
  if (fields.length === 0) return null;

  const set = (id: string, value: string | boolean) =>
    update({ customFields: { ...data.customFields, [id]: value } });

  return (
    <div className="space-y-4 mb-5">
      {fields.map((f) => {
        const val = data.customFields?.[f.id];

        if (f.type === "checkbox") {
          return (
            <label key={f.id} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={!!val}
                onChange={(e) => set(f.id, e.target.checked)}
                className="accent-[#C9A84C] w-4 h-4"
              />
              {f.label}
              {f.required && <span className="text-red-300"> *</span>}
            </label>
          );
        }

        return (
          <div key={f.id}>
            <label className={labelCls}>
              {f.label}
              {f.required && " *"}
            </label>
            {f.type === "textarea" ? (
              <textarea
                rows={3}
                value={typeof val === "string" ? val : ""}
                placeholder={f.placeholder}
                onChange={(e) => set(f.id, e.target.value)}
                className={fieldCls}
              />
            ) : f.type === "select" ? (
              <select
                value={typeof val === "string" ? val : ""}
                onChange={(e) => set(f.id, e.target.value)}
                className={fieldCls}
              >
                <option value="">Select…</option>
                {f.options.map((o) => (
                  <option key={o} value={o} className="bg-[#050E21]">{o}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                inputMode={f.type === "number" ? "numeric" : undefined}
                value={typeof val === "string" ? val : ""}
                placeholder={f.placeholder}
                onChange={(e) => set(f.id, e.target.value)}
                className={fieldCls}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
