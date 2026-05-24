"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, Sparkles, Droplets, Wrench, Check } from "lucide-react";
import type { BookingData, ServiceCategory } from "./BookingWizard";
import { OPTIONS_BY_CATEGORY, SERVICE_OPTIONS, isServiceOptionId, CATEGORY_COLORS } from "@/lib/pricing";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import { stepCopy, msg } from "@/lib/site-settings-shared";
import CustomFields from "./CustomFields";

// Presentation lookup keyed by legacy_key. The catalog stores label/blurb/
// order/enabled but not the visual icon, "default package" hint, or border
// colour — those still live here. Once Phase 7 lets admins create new
// categories, we'll add icon/color to the catalog itself.
const CATEGORY_PRESENTATION: Record<string, {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultPkg: BookingData["pkg"];
  borderColor: string;
}> = {
  CarDetailing:   { icon: Sparkles, defaultPkg: null,      borderColor: CATEGORY_COLORS.CarDetailing },
  OneTimeCarWash: { icon: Wrench,   defaultPkg: "OneTime", borderColor: CATEGORY_COLORS.OneTimeCarWash },
  CarWash:        { icon: Droplets, defaultPkg: "Daily",   borderColor: CATEGORY_COLORS.CarWash },
};

// Fallback when the catalog isn't loaded yet (initial render before the
// server-rendered settings arrive, or if the catalog query fails).
const LEGACY_CATEGORIES: Category[] = [
  { id: "CarDetailing",   label: "Doorstep Car Detailing",                       blurb: "Premium paint & interior care", ...CATEGORY_PRESENTATION.CarDetailing },
  { id: "OneTimeCarWash", label: "Doorstep One-Time Car Wash",                    blurb: "Single visit, no commitment",   ...CATEGORY_PRESENTATION.OneTimeCarWash },
  { id: "CarWash",        label: "Doorstep Car Wash - Monthly Subscription",      blurb: "Subscription doorstep wash",     ...CATEGORY_PRESENTATION.CarWash },
];

interface Category {
  id: ServiceCategory;
  label: string;
  blurb: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultPkg: BookingData["pkg"];
  borderColor: string;
}

/**
 * Resolved sub-options for a category. `id` is the legacy ServiceOptionId
 * when the catalog row has one, otherwise the catalog slug (admin-created
 * options use their slug as the stable identifier).
 */
interface DisplayOption {
  id: string;
  label: string;
  blurb: string;
}

function buildOptionsForCategory(
  catalog: ReturnType<typeof useSiteSettings>["catalog"],
  categoryId: ServiceCategory | null | undefined,
): DisplayOption[] {
  if (!categoryId) return [];
  const allowedLegacy = new Set<string>(OPTIONS_BY_CATEGORY[categoryId] ?? []);

  // Fallback: catalog not yet loaded — use legacy hardcoded set.
  if (!catalog) {
    return [...allowedLegacy].map((id) => ({
      id,
      label: SERVICE_OPTIONS[id as keyof typeof SERVICE_OPTIONS].label,
      blurb: SERVICE_OPTIONS[id as keyof typeof SERVICE_OPTIONS].blurb,
    }));
  }

  // Find the catalog category matching this category's legacy_key.
  const catCat = catalog.categories.find((c) => c.legacy_key === categoryId);
  if (!catCat) return [];

  return catalog.options
    .filter((o) => o.category_id === catCat.id && o.enabled)
    // Legacy-backed options must be in the allow-list so backfill artifacts
    // (e.g. InteriorDetailing-as-addon) don't surface as bookable. Admin-
    // created options have no legacy_id and always pass through.
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

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

// Builds the category cards from the dynamic catalog. Filters to enabled
// categories, sorts by the catalog's sort_order, and uses legacy_key as the
// stored id so leads/pricing remain stable across renames. Falls back to the
// hardcoded list if the catalog hasn't loaded yet.
function buildCategories(catalog: ReturnType<typeof useSiteSettings>["catalog"]): Category[] {
  if (!catalog || catalog.categories.length === 0) return LEGACY_CATEGORIES;
  return catalog.categories
    .filter((c) => c.enabled)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => {
      const presentation = c.legacy_key ? CATEGORY_PRESENTATION[c.legacy_key] : undefined;
      return {
        id: (c.legacy_key ?? c.slug) as ServiceCategory,
        label: c.label,
        blurb: c.blurb ?? "",
        icon: presentation?.icon ?? Sparkles,
        defaultPkg: presentation?.defaultPkg ?? null,
        borderColor: presentation?.borderColor ?? CATEGORY_COLORS.CarDetailing,
      };
    });
}

// CarShowcase visual hint derived from the chosen sub-option.
const optionToPkg: Record<string, BookingData["pkg"]> = {
  Monthly: "Daily",
  WeeklyThrice: "TriWeekly",
  OneTimeManual: "OneTime",
  OneTimeMachine: "OneTime",
  CeramicSealant: null,
  InteriorDetailing: null,
};

const PREMIUM_GOLD = "#C9A84C";
const PREMIUM_GOLD_DARK = "#9C7A2A";
const PREMIUM_GOLD_LIGHT = "#E8CC7A";
const PREMIUM_GRADIENT = `linear-gradient(135deg, ${PREMIUM_GOLD_DARK}, ${PREMIUM_GOLD}, ${PREMIUM_GOLD_LIGHT})`;

export default function StepContact({ data, update, onNext }: Props) {
  const settings = useSiteSettings();
  const booking = settings.booking;
  // Memoised so re-renders don't rebuild the list unless the catalog actually changes.
  const categories = useMemo(() => buildCategories(settings.catalog), [settings.catalog]);
  const copy = stepCopy(booking, "contact");
  const [attempted, setAttempted] = useState(false);

  const phoneValid = data.phone.trim().length >= 8;
  const nameValid = data.name.trim().length >= 2;
  const serviceValid = !!data.service && data.serviceOption.length > 0;
  const canProceed = serviceValid && nameValid && phoneValid;

  const errCategory = attempted && !data.service;
  const errOption = attempted && !!data.service && !data.serviceOption;
  const errName = attempted && !nameValid;
  const errPhone = attempted && !phoneValid;

  function handleContinue() {
    if (canProceed) {
      setAttempted(false);
      onNext();
    } else {
      setAttempted(true);
    }
  }

  const activeCategory = categories.find((c) => c.id === data.service);
  const activeOptions = useMemo(
    () => buildOptionsForCategory(settings.catalog, activeCategory?.id),
    [settings.catalog, activeCategory?.id],
  );
  const selectedOptionDef = isServiceOptionId(data.serviceOption) ? SERVICE_OPTIONS[data.serviceOption] : null;
  const addOn = selectedOptionDef?.addOn;

  function selectServiceCategory(c: (typeof categories)[number]) {
    if (c.id === data.service) return;
    update({
      service: c.id,
      serviceOption: "",
      interiorAddOn: false,
      pkg: c.defaultPkg,
    });
  }

  function selectServiceOption(optionId: string) {
    update({
      serviceOption: optionId,
      // For admin-created options (no optionToPkg mapping) fall back to the
      // category's default visual so CarShowcase still has a pkg hint.
      pkg: optionToPkg[optionId] ?? activeCategory?.defaultPkg ?? null,
      interiorAddOn: false,
    });
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        {copy.title}
      </h2>
      <p className="text-white/45 text-sm mb-5">{copy.subtitle}</p>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <User size={10} className="inline mr-1" /> {msg(booking, "contact", "name_label")} *
        </label>
        <input
          type="text"
          placeholder="Your full name"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors ${errName ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
            }`}
          style={!errName ? { "--focus-color": activeCategory?.borderColor || "#C9A84C" } as any : {}}
          onFocus={(e) => e.target.style.borderColor = (e.target as any).style.getPropertyValue("--focus-color")}
          onBlur={(e) => e.target.style.borderColor = ""}
        />
        {errName && (
          <p className="text-[11px] text-red-300 mt-1">Enter your full name (at least 2 characters).</p>
        )}
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <Phone size={10} className="inline mr-1" /> {msg(booking, "contact", "phone_label")} *
        </label>
        <input
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={data.phone}
          onChange={(e) => update({ phone: e.target.value })}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors ${errPhone ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
            }`}
          style={!errPhone ? { "--focus-color": activeCategory?.borderColor || "#C9A84C" } as any : {}}
          onFocus={(e) => e.target.style.borderColor = (e.target as any).style.getPropertyValue("--focus-color")}
          onBlur={(e) => e.target.style.borderColor = ""}
        />
        {errPhone && (
          <p className="text-[11px] text-red-300 mt-1">Enter a valid phone number.</p>
        )}
      </div>

      {/* Service required */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          {msg(booking, "contact", "service_label")} *
        </p>
        <div className={`flex flex-col gap-3 ${errCategory ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
          {categories.map((c) => {
            const selected = data.service === c.id;
            const Icon = c.icon;

            return (
              <div
                key={c.id}
                className="transition-all duration-300 relative rounded-[14px] overflow-hidden"
                style={{
                  padding: selected ? "4.5px" : "3px",
                  boxShadow: selected
                    ? `0 0 24px ${c.borderColor}66`
                    : `0 0 8px ${c.borderColor}15`,
                }}
              >
                {/* Animated Rotating Border - Always Runs */}
                <motion.div
                  className="absolute pointer-events-none"
                  style={{ inset: 0, width: "100%", height: "100%", zIndex: 0 }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "200%",
                      height: "200%",
                      transform: "translate(-50%, -50%)",
                      background: selected
                        ? `conic-gradient(from 0deg, transparent 0deg, ${c.borderColor}99 35deg, ${c.borderColor} 60deg, ${c.borderColor}CC 85deg, transparent 120deg, transparent 180deg, ${c.borderColor}99 215deg, ${c.borderColor} 240deg, ${c.borderColor}CC 265deg, transparent 300deg)`
                        : `conic-gradient(from 0deg, transparent 0deg, ${c.borderColor}60 60deg, transparent 120deg, transparent 180deg, ${c.borderColor}60 240deg, transparent 300deg)`,
                    }}
                  />
                </motion.div>

                <div
                  className="relative z-10 flex flex-col h-full overflow-hidden bg-[#050E21]"
                  style={{ borderRadius: selected ? "11px" : "11.8px" }}
                >
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectServiceCategory(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 min-h-[48px] hover:brightness-110"
                    style={{
                      background: selected
                        ? `linear-gradient(135deg, ${c.borderColor}F2 0%, ${c.borderColor}E6 100%)`
                        : `linear-gradient(135deg, ${c.borderColor}E6 0%, ${c.borderColor}D9 100%)`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: selected
                          ? `linear-gradient(135deg, ${c.borderColor}DD, ${c.borderColor}, ${c.borderColor}AA)`
                          : "rgba(255,255,255,0.05)",
                      }}
                    >
                      <Icon size={14} className={selected ? "text-[#050E21]" : "text-white/40"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${selected ? "text-white" : "text-white/85"}`}>
                        {c.label}
                      </p>
                      <p className="text-[11px] text-white/45 mt-0.5">{c.blurb}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest flex-shrink-0 px-2 py-1 rounded-md ${selected ? "text-[#050E21]" : "text-white/30 border border-white/10"
                        }`}
                      style={selected ? { background: `linear-gradient(135deg, ${c.borderColor}DD, ${c.borderColor}, ${c.borderColor}AA)` } : {}}
                    >
                      {selected ? "Selected" : "Select"}
                    </span>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className={`px-3 pt-3 pb-3 ${errOption ? "ring-2 ring-inset ring-red-400/70" : ""}`}
                          style={{ background: "rgba(255,255,255,0.02)" }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                            style={errOption ? { color: "rgb(252 165 165)" } : { color: `${c.borderColor}CC` }}
                          >
                            Choose Option *
                          </p>
                          {errOption && (
                            <p className="text-[11px] text-red-300 mb-2">Please pick one option below.</p>
                          )}
                          <div className="flex flex-col gap-2">
                            {activeOptions.map((opt) => {
                              const id = opt.id;
                              const sel = data.serviceOption === id;
                              return (
                                <button
                                  key={id}
                                  onClick={() => selectServiceOption(id)}
                                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${sel
                                      ? "text-white"
                                      : "bg-white/[0.04] text-white/75 hover:text-white active:scale-[0.99]"
                                    }`}
                                  style={
                                    sel
                                      ? {
                                          background: `${c.borderColor}1F`,
                                          border: `2px solid ${c.borderColor}`,
                                          boxShadow: `0 0 14px ${c.borderColor}33`,
                                        }
                                      : { border: "1.5px solid rgba(255,255,255,0.10)" }
                                  }
                                  onMouseEnter={(e) => {
                                    if (!sel) e.currentTarget.style.borderColor = `${c.borderColor}66`;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!sel) e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                                  }}
                                >
                                  <span className="flex items-center gap-2 text-left leading-tight">
                                    <span
                                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2"
                                      style={{ borderColor: sel ? c.borderColor : "rgba(255,255,255,0.30)" }}
                                    >
                                      {sel && (
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ background: c.borderColor }}
                                        />
                                      )}
                                    </span>
                                    <span>
                                      <span className="block font-semibold">{opt.label}</span>
                                      <span className={`block text-[11px] mt-0.5 ${sel ? "text-white/70" : "text-white/40"}`}>
                                        {opt.blurb}
                                      </span>
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {addOn && (
                            <button
                              type="button"
                              onClick={() => update({ interiorAddOn: !data.interiorAddOn })}
                              className="mt-2 w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-all"
                              style={
                                data.interiorAddOn
                                  ? { borderColor: c.borderColor, background: `${c.borderColor}14` }
                                  : { borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border"
                                  style={
                                    data.interiorAddOn
                                      ? {
                                          borderColor: c.borderColor,
                                          background: `linear-gradient(135deg, ${c.borderColor}DD, ${c.borderColor}, ${c.borderColor}AA)`,
                                        }
                                      : { borderColor: "rgba(255,255,255,0.25)" }
                                  }
                                >
                                  {data.interiorAddOn && <Check size={11} className="text-[#050E21]" strokeWidth={3} />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white leading-tight">{addOn.label}</p>
                                  <p className="text-[11px] text-white/45 mt-0.5">
                                    {selectedOptionDef?.category === "CarDetailing"
                                      ? `Pair full interior detailing with ${selectedOptionDef.shortLabel}`
                                      : "Add interior cleaning to this visit"}
                                  </p>
                                </div>
                              </div>
                              {/* Price intentionally hidden here; the actual
                                  add-on price is confirmed on the Package
                                  step alongside the vehicle's tier price. */}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
        {errCategory && (
          <p className="text-[11px] text-red-300 mt-2">Please select a service to continue.</p>
        )}
      </div>

      <CustomFields stepKey="contact" data={data} update={update} />

      {attempted && !canProceed && (
        <p className="text-[12px] text-red-300 text-center mt-4">
          Please complete the highlighted fields above.
        </p>
      )}

      <button
        onClick={handleContinue}
        className="w-full mt-3 py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 active:scale-[0.98]"
        style={{ background: PREMIUM_GRADIENT }}
      >
        {msg(booking, "contact", "continue")}
      </button>
    </div>
  );
}
