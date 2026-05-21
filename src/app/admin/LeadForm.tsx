"use client";

import { useActionState, useState } from "react";
import { User, Sparkles, Car, MapPin, Calendar, StickyNote } from "lucide-react";
import {
  OPTIONS_BY_CATEGORY,
  SERVICE_OPTIONS,
  type ServiceCategory,
  type ServiceOptionId,
} from "@/lib/pricing";
import type { LeadRow } from "@/lib/leads";

const SERVICES: { id: ServiceCategory; label: string }[] = [
  { id: "CarWash", label: "Car Wash" },
  { id: "OneTimeCarWash", label: "One-Time Car Wash" },
  { id: "CarDetailing", label: "Car Detailing" },
];

// The wizard uses these exact labels — keep in sync with StepVehicle.
const VEHICLE_LABELS = ["Hatchback", "Sedan", "Compact SUV", "SUV", "XUV & Large SUV"];

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

type LeadFormState = { error?: string };
type LeadAction = (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;

export default function LeadForm({
  action,
  initial,
  submitLabel,
  pendingLabel,
}: {
  action: LeadAction;
  initial?: Partial<LeadRow> | null;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(action, {});
  const initialService = (initial?.service as ServiceCategory | undefined) ?? "";
  const [service, setService] = useState<ServiceCategory | "">(initialService);

  const optionIds = service ? OPTIONS_BY_CATEGORY[service] : [];

  const v = (k: keyof LeadRow) => (initial?.[k] as string | number | null | undefined) ?? "";

  return (
    <form action={formAction} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="Contact" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name">
            <input name="name" defaultValue={v("name") as string} className={fieldCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" inputMode="tel" defaultValue={v("phone") as string} className={fieldCls} />
          </Field>
        </div>
      </Section>

      <Section title="Service" icon={Sparkles}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Category">
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
          </Field>
          <Field label="Option">
            <select
              name="service_option"
              defaultValue={service === initialService ? ((initial?.service_option as string) ?? "") : ""}
              className={fieldCls}
              disabled={!service}
              key={service}
            >
              <option value="">— Select option —</option>
              {optionIds.map((id) => (
                <option key={id} value={id}>{SERVICE_OPTIONS[id as ServiceOptionId].label}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" name="interior_add_on" defaultChecked={Boolean(initial?.interior_add_on)} /> Interior add-on
        </label>
      </Section>

      <Section title="Vehicle" icon={Car}>
        <Field label="Type">
          <select name="vehicle_type" className={fieldCls} defaultValue={(initial?.vehicle_type as string) ?? ""}>
            <option value="">— Select type —</option>
            {VEHICLE_LABELS.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Brand">
            <input name="car_brand" defaultValue={v("car_brand") as string} className={fieldCls} />
          </Field>
          <Field label="Model">
            <input name="car_model" defaultValue={v("car_model") as string} className={fieldCls} />
          </Field>
        </div>
        <Field label="Number plate">
          <input name="car_number" defaultValue={v("car_number") as string} className={`${fieldCls} font-mono`} />
        </Field>
      </Section>

      <Section title="Location" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Pincode">
            <input name="pincode" inputMode="numeric" maxLength={6} defaultValue={v("pincode") as string} className={`${fieldCls} font-mono`} />
          </Field>
          <Field label="Parking">
            <select name="parking_location" className={fieldCls} defaultValue={(initial?.parking_location as string) ?? ""}>
              <option value="">— Select —</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
          </Field>
        </div>
        <Field label="Address">
          <textarea name="address" rows={2} defaultValue={v("address") as string} className={`${fieldCls} resize-none`} />
        </Field>
        <Field label="Google Maps link">
          <input
            name="map_link"
            type="url"
            placeholder="https://maps.app.goo.gl/…"
            defaultValue={v("map_link") as string}
            className={fieldCls}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Car cover (if outside)">
            <select name="car_cover_choice" className={fieldCls} defaultValue={(initial?.car_cover_choice as string) ?? ""}>
              <option value="">— Select —</option>
              <option value="yes">Has cover</option>
              <option value="no">No cover</option>
            </select>
          </Field>
          <Field label="Shift">
            <select name="shift" className={fieldCls} defaultValue={(initial?.shift as string) ?? ""}>
              <option value="">— Select —</option>
              <option value="morning">Morning (4 AM – 10 AM)</option>
              <option value="evening">Evening (8 PM – 11 PM)</option>
            </select>
          </Field>
        </div>
        <Field label="Gate access notes">
          <textarea
            name="gate_access_notes"
            rows={2}
            placeholder="Guard name, society code, entry instructions…"
            defaultValue={v("gate_access_notes") as string}
            className={`${fieldCls} resize-none`}
          />
        </Field>
      </Section>

      <Section title="Scheduling" icon={Calendar}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Callback date">
            <input name="callback_date" type="date" defaultValue={v("callback_date") as string} className={`${fieldCls} [color-scheme:dark]`} />
          </Field>
          <Field label="Callback time">
            <input name="callback_time" placeholder="e.g. 10:00 AM" defaultValue={v("callback_time") as string} className={fieldCls} />
          </Field>
        </div>
      </Section>

      <Section title="Pricing & notes" icon={StickyNote}>
        <Field label="Manual price override (₹)">
          <input
            name="price_total"
            type="number"
            min={0}
            placeholder="Leave blank to auto-calc"
            defaultValue={initial?.price_total != null ? String(initial.price_total) : ""}
            className={fieldCls}
          />
        </Field>
        <Field label="Internal notes">
          <textarea name="notes" rows={3} defaultValue={v("notes") as string} className={`${fieldCls} resize-none`} />
        </Field>
      </Section>

      <div className="lg:col-span-2 space-y-3">
        {state.error && <p className="text-[12px] text-red-300">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
