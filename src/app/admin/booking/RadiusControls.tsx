"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, MapPin, RotateCcw } from "lucide-react";
import {
  SERVICE_RADIUS_KEYS,
  SERVICE_RADIUS_LABEL,
  SERVICE_RADIUS_DEFAULTS,
  RADIUS_STEP_KM,
  RADIUS_MIN_KM,
  RADIUS_MAX_KM,
  type ServiceRadius,
  type ServiceRadiusKey,
} from "@/lib/site-settings-shared";
import { bumpRadiusAction } from "./actions";

export default function RadiusControls({ initial }: { initial: ServiceRadius }) {
  const [values, setValues] = useState<ServiceRadius>(initial);
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<ServiceRadiusKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (service: ServiceRadiusKey, delta: number) => {
    setError(null);
    setBusyKey(service);
    startTransition(async () => {
      const res = await bumpRadiusAction(service, delta);
      setBusyKey(null);
      if (res.error) { setError(res.error); return; }
      if (typeof res.value === "number") {
        setValues((p) => ({ ...p, [service]: res.value as number }));
      }
    });
  };

  const reset = (service: ServiceRadiusKey) => {
    const target = SERVICE_RADIUS_DEFAULTS[service];
    const delta = target - (values[service] ?? target);
    if (delta === 0) return;
    apply(service, delta);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 max-w-2xl">
      <div className="flex items-center gap-2">
        <MapPin size={15} className="text-[#C9A84C]" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Service-area radius</h2>
      </div>
      <p className="text-[11px] text-white/40 -mt-1">
        Distance from the business location each service is offered. Customers outside this radius see the &ldquo;outside service area&rdquo; message at the location step.
      </p>

      <div className="divide-y divide-white/5">
        {SERVICE_RADIUS_KEYS.map((key) => {
          const v = values[key];
          const atMin = v <= RADIUS_MIN_KM;
          const atMax = v >= RADIUS_MAX_KM;
          const isDefault = v === SERVICE_RADIUS_DEFAULTS[key];
          const busy = pending && busyKey === key;
          return (
            <div key={key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/85">{SERVICE_RADIUS_LABEL[key]}</p>
                <p className="text-[11px] text-white/35">
                  Default {SERVICE_RADIUS_DEFAULTS[key]} km · step {RADIUS_STEP_KM} km
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => apply(key, -RADIUS_STEP_KM)}
                  disabled={busy || atMin}
                  title="Decrease"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <div className="min-w-[80px] text-center rounded-lg bg-black/30 px-2 py-1.5 tabular-nums">
                  <span className="text-base font-bold">{v}</span>
                  <span className="text-[11px] text-white/40 ml-1">km</span>
                </div>
                <button
                  type="button"
                  onClick={() => apply(key, RADIUS_STEP_KM)}
                  disabled={busy || atMax}
                  title="Increase"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => reset(key)}
                  disabled={busy || isDefault}
                  title="Reset to default"
                  className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-[12px] text-red-300">{error}</p>}
    </div>
  );
}
