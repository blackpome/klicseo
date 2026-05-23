"use client";

import { useState } from "react";
import { BUILTIN_FIELDS, builtinCfg, type BookingConfig, type BookingStepKey, type BuiltinFieldCfg } from "@/lib/site-settings-shared";

// Toggles for a step's built-in fields (show + required), serialized to a hidden
// input so they submit with the parent booking form.
export default function BuiltinToggles({ stepKey, booking }: { stepKey: BookingStepKey; booking: BookingConfig }) {
  const defs = BUILTIN_FIELDS[stepKey] ?? [];
  const [state, setState] = useState<Record<string, BuiltinFieldCfg>>(() => {
    const init: Record<string, BuiltinFieldCfg> = {};
    for (const d of defs) init[d.key] = builtinCfg(booking, stepKey, d.key);
    return init;
  });

  if (defs.length === 0) return null;

  const patch = (key: string, p: Partial<BuiltinFieldCfg>) =>
    setState((s) => ({ ...s, [key]: { ...s[key], ...p } }));

  return (
    <div className="border-t border-white/5 pt-3 space-y-2.5">
      <input type="hidden" name={`step_${stepKey}_builtins`} value={JSON.stringify(state)} />
      <span className="text-[11px] uppercase tracking-wider text-white/45">Built-in fields</span>
      {defs.map((d) => {
        const cfg = state[d.key];
        return (
          <div key={d.key} className="flex items-center gap-3 flex-wrap">
            <span className="flex-1 min-w-[160px] text-sm text-white/80">{d.label}</span>
            <label className="flex items-center gap-1.5 text-[11px] text-white/55">
              <input
                type="checkbox"
                checked={cfg.required}
                disabled={!cfg.enabled}
                onChange={(e) => patch(d.key, { required: e.target.checked })}
                className="accent-[#C9A84C] disabled:opacity-40"
              />
              Required
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={cfg.enabled}
              onClick={() => patch(d.key, { enabled: !cfg.enabled })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${cfg.enabled ? "bg-[#10b981]" : "bg-white/15"}`}
              title={cfg.enabled ? "Shown" : "Hidden"}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${cfg.enabled ? "left-[18px]" : "left-0.5"}`} />
            </button>
            <span className="text-[11px] text-white/40 w-12">{cfg.enabled ? "Shown" : "Hidden"}</span>
          </div>
        );
      })}
    </div>
  );
}
