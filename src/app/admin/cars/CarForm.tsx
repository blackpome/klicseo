"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import type { CarRecord } from "@/lib/carPricing";
import type { PriceTier } from "@/lib/priceTiers-shared";
import { createCarAction, updateCarAction } from "./actions";

const BODY_TYPES = ["Hatchback", "Sedan", "Compact SUV", "SUV", "XUV & Large SUV", "MUV", "Luxury"];

export default function CarForm({ car, tiers }: { car?: CarRecord; tiers: PriceTier[] }) {
  const editing = !!car;
  const [state, action, pending] = useActionState(
    editing ? updateCarAction : createCarAction,
    {} as { error?: string },
  );

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      {editing && <input type="hidden" name="id" value={car.id} />}

      {/* Identity */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Brand</span>
          <input
            name="brand"
            required
            defaultValue={car?.brand ?? ""}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Model</span>
          <input
            name="model"
            required
            defaultValue={car?.model ?? ""}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Body type</span>
          <input
            name="body_type"
            list="car-body-types"
            defaultValue={car?.body_type ?? ""}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <datalist id="car-body-types">
            {BODY_TYPES.map((b) => <option key={b} value={b} />)}
          </datalist>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Segment</span>
          <input
            name="segment_name"
            defaultValue={car?.segment_name ?? ""}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </label>
      </div>

      {/* Tier picker — prices are now defined by the tier */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-[#C9A84C]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Pricing tier</h2>
        </div>
        <label className="block">
          <select
            name="tier_id"
            defaultValue={car?.tier_id ?? ""}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          >
            <option value="">— No tier yet —</option>
            {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <p className="text-[11px] text-white/40">
          The car&apos;s prices are taken from the tier. You can leave this blank and assign a tier later from <span className="text-white/60">Cars without a tier</span>.
        </p>
      </div>

      {state.error && <p className="text-[12px] text-red-300">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {pending ? "Saving…" : editing ? "Save car" : "Add car"}
        </button>
        <Link href="/admin/cars" className="text-sm text-white/50 hover:text-white">Cancel</Link>
      </div>
      <p className="text-[11px] text-white/30">To edit prices, open the tier on the <span className="text-white/50">Pricing tiers</span> page — changes apply to every car in that tier.</p>
    </form>
  );
}
