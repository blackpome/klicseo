"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle, PhoneCall } from "lucide-react";
import TransformationLoop from "./TransformationLoop";
import type { BookingData } from "./BookingWizard";
import {
  OPTIONS_BY_CATEGORY,
  SERVICE_OPTIONS,
  isServiceOptionId,
  inr,
  CATEGORY_COLORS,
} from "@/lib/pricing";
import { carPriceFor, carPriceForCatalog } from "@/lib/carPricing";
import { useServiceDiscounts, useDiscountsByLineId } from "@/components/DiscountContext";
import { flag } from "@/lib/site-settings-shared";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import { stepCopy, msg } from "@/lib/site-settings-shared";
import CustomFields from "./CustomFields";

const optionToPkg: Record<string, BookingData["pkg"]> = {
  Monthly:           "Daily",
  WeeklyThrice:      "TriWeekly",
  OneTimeManual:     "OneTime",
  OneTimeMachine:    "OneTime",
  CeramicSealant:    null,
  InteriorDetailing: null,
};

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Booking option as rendered in the package step. `id` is the legacy
 *  ServiceOptionId when available; for admin-created options it's the catalog
 *  slug (a stable string saved on the lead). */
interface OptionRow {
  id: string;
  label: string;
  blurb: string;
}

/**
 * Catalog-driven option list for a category. Legacy-backed options must be in
 * OPTIONS_BY_CATEGORY (excludes backfill-only rows like InteriorDetailing-as-
 * addon). Admin-created options (no legacy_id) always pass through.
 */
function buildOptionRows(
  catalog: ReturnType<typeof useSiteSettings>["catalog"],
  category: BookingData["service"],
): OptionRow[] {
  if (!category) return [];
  const allowedLegacy = new Set<string>(OPTIONS_BY_CATEGORY[category] ?? []);

  if (!catalog) {
    return [...allowedLegacy].map((id) => ({
      id,
      label: SERVICE_OPTIONS[id as keyof typeof SERVICE_OPTIONS].label,
      blurb: SERVICE_OPTIONS[id as keyof typeof SERVICE_OPTIONS].blurb,
    }));
  }

  const catCat = catalog.categories.find((c) => c.legacy_key === category);
  if (!catCat) return [];

  return catalog.options
    .filter((o) => o.category_id === catCat.id && o.enabled)
    .filter((o) => (o.legacy_id ? allowedLegacy.has(o.legacy_id) : true))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => {
      const legacy = o.legacy_id;
      return {
        id: legacy ?? o.slug,
        label: o.label,
        blurb: o.blurb ?? (legacy ? SERVICE_OPTIONS[legacy as keyof typeof SERVICE_OPTIONS]?.blurb ?? "" : ""),
      };
    });
}

export default function StepPackage({ data, update, onNext, onBack }: Props) {
  const [attempted, setAttempted] = useState(false);
  const category = data.service;
  const settings = useSiteSettings();
  // Catalog-driven option list — same shape and identity as the legacy IDs,
  // but with renames + enabled flag + sort applied from the Services editor.
  const optionRows = useMemo(
    () => buildOptionRows(settings.catalog, category),
    [settings.catalog, category],
  );
  const selectedOption = data.serviceOption;
  const selectedDef = selectedOption ? SERVICE_OPTIONS[selectedOption as keyof typeof SERVICE_OPTIONS] : undefined;
  const errOption = attempted && !selectedDef;
  const accent = data.service ? CATEGORY_COLORS[data.service] : "#C9A84C";

  // Per-car prices come from the catalog (set in the vehicle step). null when
  // the car was entered manually / not found — then we show the call-back note.
  const discounts = useServiceDiscounts();
  const { percents: percentsByLineId, badges: badgesByLineId } = useDiscountsByLineId();
  const booking = settings.booking;
  const showDiscount = flag(booking, "package", "showDiscount");
  const packageTitle = stepCopy(booking, "package").title;
  const cp = data.carPrices;
  function optPrice(id: string, withAddOn = false) {
    if (!cp) return null;
    // Legacy options use the fast direct-keyed path. Admin-created options
    // resolve their lines through the catalog.
    if (isServiceOptionId(id)) {
      return carPriceFor(cp, id, data.parkingLocation, withAddOn, discounts);
    }
    if (!settings.catalog) return null;
    return carPriceForCatalog(cp, id, data.parkingLocation, withAddOn, settings.catalog, percentsByLineId, badgesByLineId);
  }

  const carLabel = [data.carBrand, data.carModel].filter(Boolean).join(" ");
  const selectedPriced = optPrice(selectedOption, data.interiorAddOn);

  function handleContinue() {
    if (selectedDef) {
      setAttempted(false);
      onNext();
    } else {
      setAttempted(true);
    }
  }

  function selectOption(id: string) {
    if (id === selectedOption) return;
    update({
      serviceOption: id,
      pkg: optionToPkg[id] ?? null,
      interiorAddOn: false,
    });
  }

  function toggleAddOn() {
    update({ interiorAddOn: !data.interiorAddOn });
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        {packageTitle}
      </h2>
      <p className="text-white/45 text-sm mb-3">
        {cp && carLabel
          ? `Pricing for your ${carLabel}.`
          : carLabel
          ? "We'll confirm your price on the call."
          : "Choose your service."}
      </p>

      <TransformationLoop label={selectedDef?.shortLabel} />

      {/* Vehicle summary — already chosen in the previous step */}
      {carLabel && (
        <div className="mt-3 mb-4 flex items-center justify-center gap-2 text-[11px] text-white/55">
          <span>Pricing for</span>
          <span className="px-2.5 py-1 rounded-md font-semibold text-[#050E21]"
                style={{ background: `linear-gradient(135deg, ${data.service ? CATEGORY_COLORS[data.service] : "#9C7A2A"}, ${data.service ? CATEGORY_COLORS[data.service] : "#E8CC7A"})` }}>
            {carLabel}
          </span>
          {data.parkingLocation === "outside" && <span className="text-white/40">· outside parked</span>}
        </div>
      )}

      {/* Empty-state — no service category yet */}
      {!category && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-[12px] text-amber-200/90 mb-4 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>Pick a service on the contact step to see prices.</span>
        </div>
      )}

      {/* Option cards for the chosen category */}
      <div className={`grid grid-cols-1 gap-3 mb-1 mt-2 ${errOption ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
        {optionRows.map((row) => {
          const id = row.id;
          // Static metadata (recurring, addOn) comes from SERVICE_OPTIONS for
          // legacy ids; admin-created options have no entry there, so we
          // synthesise a minimal shape from the catalog row (no addon).
          const baseDef = isServiceOptionId(id) ? SERVICE_OPTIONS[id] : { recurring: "one-time" as const, addOn: undefined };
          const opt = { ...baseDef, label: row.label, blurb: row.blurb };
          const selected = selectedOption === id;
          const p = optPrice(id, false);
          const pAdd = optPrice(id, true);
          // p.basePercent already reflects the per-line badge toggle (zeroed
          // when the badge is off, via effectiveDiscounts / carPriceForCatalog),
          // so we don't re-check `badges[...]` here — that legacy-only lookup
          // would miss admin-created options.
          const offerOn = !!p && p.basePercent > 0 && showDiscount;
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.985 }}
              onClick={() => selectOption(id)}
              className={`relative text-left rounded-xl p-4 border transition-all duration-300 ${
                selected
                  ? "border-[#C9A84C] shadow-[0_0_20px_rgba(201,168,76,0.25)]"
                  : "glass-card hover:border-[#1A5FD4]/40"
              }`}
              style={
                selected
                  ? {
                      background: "linear-gradient(145deg,rgba(255,255,255,0.05),rgba(5,14,33,0.9))",
                      borderColor: data.service ? CATEGORY_COLORS[data.service] : "#C9A84C",
                      boxShadow: `0 0 20px ${data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"}40`
                    }
                  : {}
              }
            >
              {/* Offer chip — sticks slightly above the card's top-right corner so
                  it doesn't overlap the price column. */}
              {offerOn && p && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-2 right-3 z-10 inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_2px_8px_rgba(220,38,38,0.5)]"
                  style={{ background: "linear-gradient(135deg,#DC2626 0%,#F97316 100%)" }}
                >
                  {p.basePercent}% OFF
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
                      {opt.label}
                    </span>
                    {selected && (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${data.service ? CATEGORY_COLORS[data.service] : "#9C7A2A"}, ${data.service ? CATEGORY_COLORS[data.service] : "#E8CC7A"})` }}
                      >
                        <Check size={9} className="text-[#050E21]" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <p className="text-white/40 text-[11px] mb-1">{opt.blurb}</p>
                  {opt.addOn && pAdd && pAdd.addOn > 0 && (
                    <p className="text-[10px] text-white/35">
                      {opt.addOn.label}: +{inr(pAdd.discountedAddOn)}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0 ml-1">
                  <div className="text-lg sm:text-xl font-bold leading-tight"
                       style={{ fontFamily: "var(--font-playfair)", color: data.service ? CATEGORY_COLORS[data.service] : "#C9A84C" }}>
                    {p ? (
                      offerOn ? (
                        <>
                          <span
                            className="inline-block align-middle text-[13px] font-bold text-white line-through decoration-white/80 decoration-1 px-2 py-0.5 rounded shadow-[0_1px_4px_rgba(220,38,38,0.45)] mr-1"
                            style={{ background: "linear-gradient(135deg,#DC2626 0%,#F97316 100%)" }}
                          >
                            {inr(p.base)}
                          </span>
                          {inr(p.discountedBase)}
                        </>
                      ) : (
                        inr(p.discountedBase)
                      )
                    ) : (
                      "On call"
                    )}
                  </div>
                  <div className="text-white/35 text-[10px]">
                    {p ? (opt.recurring === "monthly" ? "/mo" : "one time") : "price by team"}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
      {errOption && <p className="text-[11px] text-red-300 mt-2 mb-3">Pick an option to continue.</p>}
      {!errOption && <div className="mb-3" />}

      {/* Interior add-on — Ceramic Sealant / One-Time Manual */}
      {selectedDef?.addOn && (
        <button
          onClick={toggleAddOn}
          className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border text-left mb-4 transition-all ${
            data.interiorAddOn
              ? `border-[${data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"}] bg-[${data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"}15]`
              : "glass-card hover:border-[#1A5FD4]/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${
                data.interiorAddOn
                  ? ""
                  : "border-white/25"
              }`}
              style={data.interiorAddOn ? {
                background: `linear-gradient(135deg, ${data.service ? CATEGORY_COLORS[data.service] : "#9C7A2A"}, ${data.service ? CATEGORY_COLORS[data.service] : "#E8CC7A"})`,
                borderColor: data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"
              } : {}}
            >
              {data.interiorAddOn && <Check size={11} className="text-[#050E21]" strokeWidth={3} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{selectedDef.addOn.label}</p>
              <p className="text-[11px] text-white/45 mt-0.5">
                {selectedDef.category === "CarDetailing"
                  ? `Pair full interior detailing with ${selectedDef.shortLabel}`
                  : "Add interior cleaning to this visit"}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: accent }}>
            {(() => {
              const pAdd = optPrice(selectedOption, true);
              return pAdd && pAdd.addOn > 0 ? `+${inr(pAdd.discountedAddOn)}` : "on call";
            })()}
          </span>
        </button>
      )}

      {/* Total preview / call-back fallback */}
      {selectedDef && selectedPriced && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
          style={{
            background: `${accent}15`,
            border: `1px solid ${accent}40`
          }}
        >
          <div>
            <p className="text-white/60 text-sm leading-none">Estimated total</p>
            <p className="text-white/35 text-[10px] mt-0.5">
              {selectedDef.recurring === "monthly" ? "per month" : "one time"}
              {carLabel ? ` · ${carLabel}` : ""}
            </p>
          </div>
          <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: accent }}>
            {selectedPriced.hasDiscount && showDiscount && (
              <span
                className="inline-block align-middle text-sm font-bold text-white line-through decoration-white/80 decoration-1 px-2 py-0.5 rounded-md shadow-[0_2px_8px_rgba(220,38,38,0.4)] mr-2"
                style={{ background: "linear-gradient(135deg,#DC2626 0%,#F97316 100%)" }}
              >
                {inr(selectedPriced.total)}
              </span>
            )}
            {inr(selectedPriced.discountedTotal)}
          </span>
        </div>
      )}
      {selectedDef && !selectedPriced && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-xl mb-5 text-[12px] leading-snug text-amber-200"
          style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.30)" }}
        >
          <PhoneCall size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            We don&apos;t have a listed price for this car &amp; service yet — our team will
            call you back shortly with the exact price. You can still continue your booking.
          </span>
        </div>
      )}

      {attempted && !selectedDef && (
        <p className="text-[12px] text-red-300 text-center mb-3">
          Please pick an option above to continue.
        </p>
      )}

      <CustomFields stepKey="package" data={data} update={update} />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-semibold text-sm text-white/60 glass-card hover:text-white active:scale-95 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-[2] py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {msg(booking, "package", "continue")}
        </button>
      </div>
    </div>
  );
}
