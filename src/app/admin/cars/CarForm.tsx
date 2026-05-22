"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PRICE_LINE_GROUPS, PRICE_LINE_LABEL } from "@/lib/pricing";
import type { CarRecord } from "@/lib/carPricing";
import { createCarAction, updateCarAction } from "./actions";

const BODY_TYPES = ["Hatchback", "Sedan", "Compact SUV", "SUV", "XUV & Large SUV", "MUV", "Luxury"];

function PriceField({ line, defaultValue }: { line: string; defaultValue: number | null }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/45">{PRICE_LINE_LABEL[line as keyof typeof PRICE_LINE_LABEL]}</span>
      <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C] overflow-hidden">
        <span className="pl-3 text-sm text-white/40 select-none">₹</span>
        <input
          type="text"
          inputMode="numeric"
          name={line}
          defaultValue={defaultValue ?? ""}
          placeholder="—"
          className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
        />
      </div>
    </label>
  );
}

export default function CarForm({ car }: { car?: CarRecord }) {
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

      {/* Prices, grouped */}
      {PRICE_LINE_GROUPS.map((group) => (
        <div key={group.category} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-3">{group.title}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {group.lines.map((line) => (
              <PriceField key={line} line={line} defaultValue={car ? (car[line as keyof CarRecord] as number | null) : null} />
            ))}
          </div>
        </div>
      ))}

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
      <p className="text-[11px] text-white/30">Leave a price blank for “price on request”. Discounts are set on the Discount page and apply on top of these.</p>
    </form>
  );
}
