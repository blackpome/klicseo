"use client";

import { useActionState, useState } from "react";
import FlagToggle from "./FlagToggle";
import { Check, AlertCircle } from "lucide-react";
import { saveBookingAction } from "./actions";
import { BOOKING_STEP_DEFS, MESSAGE_DEFS, STEP_FLAG_DEFS, flag, type BookingConfig, type ServiceRadius } from "@/lib/site-settings-shared";
import type { ServiceCatalog } from "@/lib/serviceCatalog-shared";
import FieldBuilder from "./FieldBuilder";
import BuiltinToggles from "./BuiltinToggles";
import ResetStepButton from "./ResetStepButton";
import RadiusControls from "./RadiusControls";
import ServicesEditor from "./ServicesEditor";

const input = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]";

export default function BookingForm({
  current,
  serviceRadius,
  catalog,
}: {
  current: BookingConfig;
  serviceRadius: ServiceRadius;
  catalog: ServiceCatalog;
}) {
  const [state, action, pending] = useActionState(saveBookingAction, {} as { error?: string; ok?: string });
  const [active, setActive] = useState(BOOKING_STEP_DEFS[0].key);

  return (
    <form action={action} className="space-y-4 max-w-2xl">
      {/* Step tabs (like the leads status tabs) */}
      <div className="flex flex-wrap gap-2">
        {BOOKING_STEP_DEFS.map((s) => {
          const on = active === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                on ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <span className={on ? "text-[#050E21]/60" : "text-white/35"}>{s.order}</span> {s.label}
            </button>
          );
        })}
      </div>

      {/* All panels stay mounted (so every field submits); only the active one shows. */}
      {BOOKING_STEP_DEFS.map((s) => {
        const cur = current[s.key];
        return (
          <div key={s.key} className={active === s.key ? "rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3" : "hidden"}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Step {s.order} · {s.label}</h2>
              <ResetStepButton stepKey={s.key} label={s.label} />
            </div>

            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-white/45">Title</span>
              <input name={`step_${s.key}_title`} defaultValue={cur?.title ?? ""} placeholder={s.title} className={`mt-1 ${input}`} />
            </label>

            {s.editableSubtitle ? (
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-white/45">Subtitle</span>
                <input name={`step_${s.key}_subtitle`} defaultValue={cur?.subtitle ?? ""} placeholder={s.subtitle} className={`mt-1 ${input}`} />
              </label>
            ) : (
              <p className="text-[11px] text-white/30">Subtitle here is dynamic (live pricing) and isn’t editable.</p>
            )}

            {(MESSAGE_DEFS[s.key] ?? []).length > 0 && (
              <div className="border-t border-white/5 pt-3 space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider text-white/45">Messages &amp; text</span>
                {(MESSAGE_DEFS[s.key] ?? []).map((m) => (
                  <label key={m.key} className="block">
                    <span className="text-[11px] text-white/45">{m.label}</span>
                    {m.multiline ? (
                      <textarea
                        name={`step_${s.key}_msg_${m.key}`}
                        defaultValue={cur?.messages?.[m.key] ?? ""}
                        placeholder={m.default}
                        rows={3}
                        className={`mt-1 ${input}`}
                      />
                    ) : (
                      <input
                        name={`step_${s.key}_msg_${m.key}`}
                        defaultValue={cur?.messages?.[m.key] ?? ""}
                        placeholder={m.default}
                        className={`mt-1 ${input}`}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            <BuiltinToggles stepKey={s.key} booking={current} />

            {(STEP_FLAG_DEFS[s.key] ?? []).length > 0 && (
              <div className="border-t border-white/5 pt-3 space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-white/45">Display options</span>
                {(STEP_FLAG_DEFS[s.key] ?? []).map((f) => (
                  <FlagToggle
                    key={f.key}
                    name={`step_${s.key}_flag_${f.key}`}
                    label={f.label}
                    help={f.help}
                    defaultOn={flag(current, s.key, f.key)}
                  />
                ))}
              </div>
            )}

            {/* Step-1 only: edit service categories + sub-categories. */}
            {s.key === "contact" && <ServicesEditor catalog={catalog} />}

            {/* Step-3 only: service-area radius is part of the location step. */}
            {s.key === "location" && (
              <div className="border-t border-white/5 pt-3">
                <RadiusControls initial={serviceRadius} />
              </div>
            )}

            <div className="border-t border-white/5 pt-3">
              <FieldBuilder stepKey={s.key} initial={cur?.fields ?? []} />
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state.ok && <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300"><Check size={14} /> {state.ok}</span>}
        {state.error && <span className="inline-flex items-center gap-1 text-[12px] text-red-300"><AlertCircle size={14} /> {state.error}</span>}
      </div>
    </form>
  );
}
