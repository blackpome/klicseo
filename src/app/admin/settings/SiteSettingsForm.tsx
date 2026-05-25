"use client";

import { useActionState, useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { saveSiteSettingsAction } from "./actions";
import type { SiteSettings } from "@/lib/site-settings-shared";
import { CARD_DEFS, type CardId } from "@/lib/card-prices-shared";
import { SOCIAL_PLATFORMS, type SocialKey } from "@/lib/site-settings-shared";

export default function SiteSettingsForm({ current }: { current: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSiteSettingsAction, {} as { error?: string; ok?: string });
  const [cardOn, setCardOn] = useState<Record<CardId, boolean>>(() => {
    const init = {} as Record<CardId, boolean>;
    for (const d of CARD_DEFS) init[d.id] = current.cardPrices[d.id].enabled;
    return init;
  });
  const [socialOn, setSocialOn] = useState<Record<SocialKey, boolean>>(() => {
    const init = {} as Record<SocialKey, boolean>;
    for (const p of SOCIAL_PLATFORMS) init[p.key] = current.social[p.key].enabled;
    return init;
  });

  return (
    <form action={action} className="space-y-5 max-w-lg">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Starting price (Hero & sticky CTA)</span>
          <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C] overflow-hidden max-w-[160px]">
            <span className="pl-3 text-sm text-white/40">₹</span>
            <input
              type="text"
              inputMode="numeric"
              name="startPrice"
              defaultValue={current.startPrice}
              className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
            />
            <span className="pr-3 text-sm text-white/40">/day</span>
          </div>
          <span className="text-[11px] text-white/30">Shown as “Book Now · Starts @ ₹X/day”.</span>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Phone number (call links)</span>
          <input
            type="text"
            name="phone"
            defaultValue={current.phone}
            placeholder="+91 79043 32212"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">WhatsApp number (chat links)</span>
          <input
            type="text"
            name="whatsapp"
            defaultValue={current.whatsapp}
            placeholder="+91 79043 32212"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <span className="text-[11px] text-white/30">Used for the WhatsApp button (wa.me). Can be the same as the phone.</span>
        </label>
      </div>

      {/* Pricing card "from" prices */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Pricing card prices</h2>
          <p className="text-[11px] text-white/35">The “Starts @ ₹X” figure on each homepage pricing card. Toggle on to use your custom price instead of the default.</p>
        </div>
        {CARD_DEFS.map((d) => {
          const cur = current.cardPrices[d.id];
          const on = cardOn[d.id];
          return (
            <div key={d.id} className="flex items-center gap-3 flex-wrap">
              <span className="flex-1 min-w-[120px] text-sm text-white/80">{d.label}</span>

              {/* Use-custom toggle */}
              <input type="hidden" name={`card_${d.id}_on`} value={on ? "on" : "off"} />
              <label className="flex items-center gap-2 text-[11px] text-white/55">
                Use custom
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Use custom ${d.label} price`}
                  onClick={() => setCardOn((p) => ({ ...p, [d.id]: !p[d.id] }))}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[#10b981]" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </label>

              <div className={`flex items-center rounded-lg border bg-white/5 overflow-hidden transition-colors ${on ? "border-white/10 focus-within:border-[#C9A84C]" : "border-white/5 opacity-50"}`}>
                <span className="pl-3 text-sm text-white/40">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name={`card_${d.id}_price`}
                  defaultValue={cur.price}
                  className="w-24 bg-transparent px-2 py-2 text-sm focus:outline-none"
                />
                <span className="pr-3 text-xs text-white/35">{d.suffix}</span>
              </div>

              {/* MRP override — independent of the "Use custom" toggle. Blank
                  means no strike on the homepage card. The % ribbon from the
                  Discounts tab only renders when an MRP is set so it has a
                  reference price to strike. */}
              <div
                className="flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C] overflow-hidden"
                title="Optional struck-through MRP. Leave blank to hide the strike."
              >
                <span className="pl-3 text-[11px] uppercase tracking-wider text-white/35">MRP ₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name={`card_${d.id}_mrp`}
                  defaultValue={cur.mrp ?? ""}
                  placeholder="—"
                  className="w-20 bg-transparent px-2 py-2 text-sm focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-white/25 w-24">default ₹{d.default.toLocaleString("en-IN")}</span>
            </div>
          );
        })}
      </div>

      {/* Social links */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Social links</h2>
          <p className="text-[11px] text-white/35">Toggle on the ones you want shown in the footer, and paste the link.</p>
        </div>
        {SOCIAL_PLATFORMS.map((p) => {
          const on = socialOn[p.key];
          return (
            <div key={p.key} className="flex items-center gap-3 flex-wrap">
              <input type="hidden" name={`social_${p.key}_on`} value={on ? "on" : "off"} />
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Show ${p.label}`}
                onClick={() => setSocialOn((s) => ({ ...s, [p.key]: !s[p.key] }))}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[#10b981]" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
              </button>
              <span className="w-20 text-sm text-white/80">{p.label}</span>
              <input
                type="url"
                name={`social_${p.key}_url`}
                defaultValue={current.social[p.key].url}
                placeholder={p.placeholder}
                className={`flex-1 min-w-[180px] bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] ${on ? "border-white/10" : "border-white/5 opacity-50"}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.ok && <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300"><Check size={14} /> {state.ok}</span>}
        {state.error && <span className="inline-flex items-center gap-1 text-[12px] text-red-300"><AlertCircle size={14} /> {state.error}</span>}
      </div>
    </form>
  );
}
