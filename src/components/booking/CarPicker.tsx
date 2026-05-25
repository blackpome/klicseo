"use client";

import { useEffect, useState } from "react";
import { Car, Search, Loader2, CheckCircle, Info } from "lucide-react";
import type { BookingData } from "./BookingWizard";
import type { CarRecord, CarPrices } from "@/lib/carPricing";

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  accent: string;
  errBrand: boolean;
  errModel: boolean;
}

// Pull the 9 legacy price columns AND the line-id-keyed amounts map off a
// search result, so admin-created sub-categories can be priced downstream.
// Also carry the optional MRP overrides (legacy 9-key + line-id-keyed) so the
// booking steps can render the admin-typed strike-through price.
export function pricesOf(c: CarRecord): CarPrices {
  return {
    monthly: c.monthly,
    weekly_thrice: c.weekly_thrice,
    outside_monthly: c.outside_monthly,
    outside_weekly_thrice: c.outside_weekly_thrice,
    one_time_manual: c.one_time_manual,
    one_time_machine: c.one_time_machine,
    interior: c.interior,
    car_detailing: c.car_detailing,
    interior_detailing: c.interior_detailing,
    amounts: c.amounts ?? {},
    mrp: c.mrp,
    mrpAmounts: c.mrpAmounts ?? {},
  };
}

async function fetchCars(q: string): Promise<CarRecord[]> {
  if (q.trim().length < 1) return [];
  try {
    const res = await fetch(`/api/cars/search?q=${encodeURIComponent(q)}`);
    const json = await res.json().catch(() => ({}));
    return Array.isArray(json.cars) ? (json.cars as CarRecord[]) : [];
  } catch {
    return [];
  }
}

export default function CarPicker({ data, update, accent, errBrand, errModel }: Props) {
  const accent20 = `${accent}33`;

  const [brandSugs, setBrandSugs] = useState<string[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const [carSugs, setCarSugs] = useState<CarRecord[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Has the user typed a brand+model that we couldn't match in the catalog?
  const typedSomething = data.carBrand.trim().length > 0 && data.carModel.trim().length > 0;
  const matched = data.carId !== null && data.carPrices !== null;
  const unmatched = typedSomething && !matched;

  // ── Brand suggestions (debounced). All state writes happen inside the
  // timeout (async) so we never set state synchronously in the effect body. ──
  useEffect(() => {
    const term = data.carBrand.trim();
    const t = setTimeout(async () => {
      if (!brandOpen || term.length < 1) {
        setBrandSugs([]);
        return;
      }
      const cars = await fetchCars(term);
      const brands: string[] = [];
      for (const c of cars) {
        if (
          c.brand.toLowerCase().includes(term.toLowerCase()) &&
          !brands.includes(c.brand)
        ) {
          brands.push(c.brand);
        }
      }
      setBrandSugs(brands.slice(0, 6));
    }, term ? 220 : 0);
    return () => clearTimeout(t);
  }, [data.carBrand, brandOpen]);

  // ── Car (model) suggestions (debounced) ──
  useEffect(() => {
    const model = data.carModel.trim();
    const t = setTimeout(async () => {
      if (!modelOpen || model.length < 1) {
        setCarSugs([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const q = data.carBrand.trim() ? `${data.carBrand} ${model}` : model;
      let cars = await fetchCars(q);
      // Prefer cars from the chosen brand when one is set.
      if (data.carBrand.trim()) {
        const b = data.carBrand.trim().toLowerCase();
        const inBrand = cars.filter((c) => c.brand.toLowerCase() === b);
        if (inBrand.length) cars = inBrand;
      }
      setCarSugs(cars.slice(0, 8));
      setLoading(false);
    }, model ? 220 : 0);
    return () => clearTimeout(t);
  }, [data.carModel, data.carBrand, modelOpen]);

  function pickBrand(brand: string) {
    update({ carBrand: brand, carId: null, carPrices: null });
    setBrandOpen(false);
  }

  function pickCar(c: CarRecord) {
    update({
      carBrand: c.brand,
      carModel: c.model,
      carId: c.id,
      carPrices: pricesOf(c),
      vehicleType: c.body_type ?? "",
    });
    setModelOpen(false);
    setCarSugs([]);
  }

  const inputBase =
    "w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors";

  return (
    <div className="mb-5">
      {/* ── Car Brand ── */}
      <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
        <Car size={11} className="inline mr-1" /> Car Brand *
      </label>
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="e.g. Maruti Suzuki, Hyundai, Tata…"
          value={data.carBrand}
          onChange={(e) => update({ carBrand: e.target.value, carId: null, carPrices: null })}
          onFocus={(e) => {
            setBrandOpen(true);
            if (!errBrand) {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }
          }}
          onBlur={(e) => {
            // Delay so a suggestion click registers before close.
            setTimeout(() => setBrandOpen(false), 150);
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
          className={`${inputBase} ${errBrand ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"}`}
        />
        {brandOpen && brandSugs.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-white/10 bg-[#071F4A] shadow-xl overflow-hidden">
            {brandSugs.map((b) => (
              <button
                key={b}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickBrand(b)}
                className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>
      {errBrand && <p className="text-[11px] text-red-300 -mt-3 mb-3">Enter your car brand.</p>}

      {/* ── Car Model ── */}
      <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
        <Search size={11} className="inline mr-1" /> Car Model *
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="e.g. Swift, Creta, Nexon…"
          value={data.carModel}
          onChange={(e) => update({ carModel: e.target.value, carId: null, carPrices: null })}
          onFocus={(e) => {
            setModelOpen(true);
            if (!errModel) {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }
          }}
          onBlur={(e) => {
            setTimeout(() => setModelOpen(false), 150);
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
          className={`${inputBase} ${errModel ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"}`}
        />
        {loading && (
          <Loader2 size={14} className="animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
        )}
        {modelOpen && carSugs.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-white/10 bg-[#071F4A] shadow-xl overflow-hidden max-h-64 overflow-y-auto">
            {carSugs.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickCar(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
              >
                <span className="text-sm text-white/85">
                  {c.model}
                  <span className="text-white/40"> · {c.brand}</span>
                </span>
                {c.body_type && (
                  <span className="text-[10px] text-white/40 flex-shrink-0">{c.body_type}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {errModel && <p className="text-[11px] text-red-300 mt-1">Enter your car model.</p>}

      {/* Match feedback */}
      {matched && (
        <p className="flex items-center gap-1.5 text-[11px] mt-2" style={{ color: accent }}>
          <CheckCircle size={12} className="flex-shrink-0" />
          {data.carBrand} {data.carModel} found — pricing loaded.
        </p>
      )}
      {unmatched && (
        <p className="flex items-start gap-1.5 text-[11px] text-white/45 mt-2">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          We don&apos;t have this car listed yet — that&apos;s fine, our team will confirm
          the price with you on the call.
        </p>
      )}
    </div>
  );
}
