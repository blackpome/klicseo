"use client";

import { useActionState, useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { saveDiscountAction } from "./actions";
import { discountedPrice, inr, PRICE_LINE_LABEL, type PriceLine } from "@/lib/pricing";

// Hatchback-tier sample prices, only to preview what a % does (real prices vary
// by car/tier).
const SAMPLE_BASE: Record<PriceLine, number> = {
  monthly: 999,
  weekly_thrice: 649,
  outside_monthly: 1199,
  outside_weekly_thrice: 749,
  one_time_manual: 249,
  one_time_machine: 399,
  interior: 149,
  car_detailing: 4999,
  interior_detailing: 1999,
};

export default function DiscountRow({
  line,
  current,
  badge,
}: {
  line: PriceLine;
  current: number;
  badge: boolean;
}) {
  const [state, action, pending] = useActionState(saveDiscountAction, {} as { error?: string; ok?: string });
  const [val, setVal] = useState(String(current));
  const [badgeOn, setBadgeOn] = useState(badge);

  const num = val === "" ? 0 : Number(val);
  const dirty = num !== current || badgeOn !== badge;
  const sample = SAMPLE_BASE[line];

  function onChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits === "") return setVal("");
    setVal(String(Math.min(100, Number(digits))));
  }

  return (
    <form action={action} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0 flex-wrap">
      <input type="hidden" name="line" value={line} />
      <input type="hidden" name="percent" value={val === "" ? "0" : val} />
      <input type="hidden" name="badge" value={badgeOn ? "on" : "off"} />

      <div className="flex-1 min-w-[150px]">
        <div className="text-sm text-white/85">{PRICE_LINE_LABEL[line]}</div>
        <div className="text-[11px] text-white/35 tabular-nums">
          {num > 0 ? (
            <>
              <span className="line-through">{inr(sample)}</span>
              <span className="mx-1">→</span>
              <span className="text-emerald-300">{inr(discountedPrice(sample, num))}</span>
            </>
          ) : (
            <span>no discount</span>
          )}
        </div>
      </div>

      {/* Badge on/off for this line */}
      <button
        type="button"
        role="switch"
        aria-checked={badgeOn}
        aria-label={`${PRICE_LINE_LABEL[line]} badge`}
        title={badgeOn ? "Badge shown" : "Badge hidden"}
        onClick={() => setBadgeOn((v) => !v)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${badgeOn ? "bg-[#10b981]" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${badgeOn ? "left-[18px]" : "left-0.5"}`} />
      </button>

      {/* Clean text field with a % suffix — no number stepper */}
      <div className="flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C] overflow-hidden">
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${PRICE_LINE_LABEL[line]} discount percent`}
          value={val}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          className="w-14 bg-transparent px-3 py-2 text-sm text-right focus:outline-none"
        />
        <span className="pr-3 text-sm text-white/40 select-none">%</span>
      </div>

      <button
        type="submit"
        disabled={pending || !dirty}
        className={`text-xs px-3.5 py-2 rounded-lg font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
          dirty ? "bg-[#C9A84C] text-[#050E21] hover:brightness-110" : "bg-white/10 text-white/60"
        }`}
      >
        {pending ? "Saving…" : "Save"}
      </button>

      <span className="basis-full sm:basis-auto min-w-[90px] text-[11px]">
        {dirty && !pending ? (
          <span className="text-amber-300">unsaved</span>
        ) : state.ok ? (
          <span className="inline-flex items-center gap-1 text-emerald-300"><Check size={12} /> {state.ok}</span>
        ) : state.error ? (
          <span className="inline-flex items-center gap-1 text-red-300"><AlertCircle size={12} /> {state.error}</span>
        ) : null}
      </span>
    </form>
  );
}
