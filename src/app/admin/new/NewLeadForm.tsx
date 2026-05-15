"use client";

import { useActionState, useState } from "react";
import { createLeadAction } from "../actions";
import {
  OPTIONS_BY_CATEGORY,
  SERVICE_OPTIONS,
  type ServiceCategory,
  type ServiceOptionId,
} from "@/lib/pricing";

const SERVICES: { id: ServiceCategory; label: string }[] = [
  { id: "CarWash", label: "Car Wash" },
  { id: "OneTimeCarWash", label: "One-Time Car Wash" },
  { id: "CarDetailing", label: "Car Detailing" },
];

// The wizard uses these exact labels — keep in sync with StepVehicle.
const VEHICLE_LABELS = ["Hatchback", "Sedan", "Compact SUV", "SUV", "XUV & Large SUV"];

const fieldCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]";

export default function NewLeadForm() {
  const [state, action, pending] = useActionState(createLeadAction, { error: undefined as string | undefined });
  const [service, setService] = useState<ServiceCategory | "">("");

  const optionIds = service ? OPTIONS_BY_CATEGORY[service] : [];

  return (
    <form action={action} className="space-y-5">
      {/* Contact */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Contact</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input name="name" placeholder="Full name *" required className={fieldCls} />
          <input name="phone" placeholder="Phone *" required inputMode="tel" className={fieldCls} />
        </div>
      </fieldset>

      {/* Service */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Service</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            name="service"
            value={service}
            onChange={(e) => setService(e.target.value as ServiceCategory | "")}
            className={fieldCls}
          >
            <option value="">— Select service —</option>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select name="service_option" className={fieldCls} disabled={!service}>
            <option value="">— Select option —</option>
            {optionIds.map((id) => (
              <option key={id} value={id}>{SERVICE_OPTIONS[id as ServiceOptionId].label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" name="interior_add_on" /> Interior add-on
        </label>
      </fieldset>

      {/* Vehicle */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Vehicle</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select name="vehicle_type" className={fieldCls} defaultValue="">
            <option value="">— Type —</option>
            {VEHICLE_LABELS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <input name="car_model" placeholder="Model" className={fieldCls} />
          <input name="car_number" placeholder="Number plate" className={fieldCls} />
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Location</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input name="pincode" placeholder="Pincode" inputMode="numeric" maxLength={6} className={fieldCls} />
          <select name="parking_location" className={fieldCls} defaultValue="">
            <option value="">— Parking —</option>
            <option value="inside">Inside</option>
            <option value="outside">Outside</option>
          </select>
        </div>
        <textarea name="address" rows={2} placeholder="Address" className={`${fieldCls} resize-none`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select name="car_cover_choice" className={fieldCls} defaultValue="">
            <option value="">— Car cover (if outside) —</option>
            <option value="yes">Has cover</option>
            <option value="no">No cover</option>
          </select>
          <select name="shift" className={fieldCls} defaultValue="">
            <option value="">— Shift —</option>
            <option value="morning">Morning (4 AM – 10 AM)</option>
            <option value="evening">Evening (8 PM – 11 PM)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" name="gate_access_consent" /> Gate access confirmed
        </label>
      </fieldset>

      {/* Callback */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Callback</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input name="callback_date" type="date" className={`${fieldCls} [color-scheme:dark]`} />
          <input name="callback_time" placeholder="e.g. 10:00 AM" className={fieldCls} />
        </div>
      </fieldset>

      {/* Override / notes */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Notes</legend>
        <input
          name="price_total"
          type="number"
          min={0}
          placeholder="Manual price override (₹) — leave blank to auto-calc"
          className={fieldCls}
        />
        <textarea name="notes" rows={3} placeholder="Internal notes" className={`${fieldCls} resize-none`} />
      </fieldset>

      {state.error && <p className="text-[12px] text-red-300">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        {pending ? "Saving…" : "Save Lead"}
      </button>
    </form>
  );
}
