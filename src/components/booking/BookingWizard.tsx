"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import StepPackage from "./StepPackage";
import { pricesOf } from "./CarPicker";
import type { CarRecord } from "@/lib/carPricing";
import StepVehicle from "./StepVehicle";
import StepContact from "./StepContact";
import StepLocation from "./StepLocation";
import StepConfirm from "./StepConfirm";
import type { ServiceCategory } from "@/lib/pricing";
import type { CarPrices } from "@/lib/carPricing";

export type { ServiceCategory } from "@/lib/pricing";

export interface BookingData {
  service: ServiceCategory | null;
  // Canonical ServiceOptionId from src/lib/pricing.ts (e.g. "Monthly",
  // "OneTimeManual", "CeramicSealant"). "" until the user picks one on Step 1.
  serviceOption: string;
  // Only meaningful for OneTimeManual today.
  interiorAddOn: boolean;
  // Visual hint only — drives CarShowcase styling. Derived from serviceOption
  // by StepContact / deep-link handler; not used for pricing.
  pkg: "Daily" | "TriWeekly" | "OneTime" | null;
  vehicleType: string;
  carBrand: string;
  carModel: string;
  carNumber: string;
  // Set when the car is matched in the DB catalog; null for manual entry.
  carId: string | null;
  // Price snapshot for the matched car (the 9 service prices). null = manual
  // entry / not found → the wizard shows the "we'll call you back" fallback.
  carPrices: CarPrices | null;
  name: string;
  phone: string;
  pincode: string;
  address: string;
  parkingLocation: "" | "inside" | "outside";
  carCoverChoice: "" | "yes" | "no";
  gateAccessConsent: boolean;
  date: string;
  time: string;
  shift: "" | "morning" | "evening";
  latitude: number | null;
  longitude: number | null;
  // Answers to admin-defined custom fields, keyed by field id.
  customFields: Record<string, string | boolean>;
  // Server-side id of the draft lead row this wizard session is mirroring.
  // null until the user enters a valid phone in Step 1, at which point we
  // POST /api/booking/draft and store the returned lead id here. Subsequent
  // changes PUT against this id; final submit promotes the row.
  draftId: string | null;
}

const TOTAL_STEPS = 5;

// localStorage key for the in-progress booking draft. Survives page refresh
// so a 5-step form isn't punishing if the tab is reloaded mid-fill.
const DRAFT_KEY = "klicseo-booking-draft";

function readDraft(): Partial<BookingData> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<BookingData>) : null;
  } catch {
    return null;
  }
}

function writeDraft(data: BookingData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // Storage may be full or disabled (private mode) — silently no-op.
  }
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

// True when the user has entered anything worth saving — skips the initial
// empty-form state so we don't insert blank drafts the moment the wizard
// mounts. Once any field has a value, the partial-save effect kicks in.
function hasAnyData(d: BookingData): boolean {
  const strings: Array<string | null | undefined> = [
    d.name, d.phone, d.service, d.serviceOption, d.vehicleType,
    d.carBrand, d.carModel, d.carNumber, d.pincode, d.address,
    d.parkingLocation, d.carCoverChoice, d.shift, d.date,
  ];
  if (strings.some((s) => s && String(s).trim().length > 0)) return true;
  if (d.interiorAddOn || d.gateAccessConsent) return true;
  if (d.latitude != null || d.longitude != null) return true;
  if (d.customFields && Object.keys(d.customFields).length > 0) return true;
  return false;
}

// Subset of BookingData the /api/booking/draft endpoint expects. Excludes
// server-derived bits (carPrices, vehicleType-from-search) and the draftId
// itself, which is carried separately on PUTs.
function wizardToDraftPayload(d: BookingData) {
  return {
    name: d.name,
    phone: d.phone,
    service: d.service,
    serviceOption: d.serviceOption,
    interiorAddOn: d.interiorAddOn,
    vehicleType: d.vehicleType,
    carBrand: d.carBrand,
    carModel: d.carModel,
    carNumber: d.carNumber,
    pincode: d.pincode,
    address: d.address,
    parkingLocation: d.parkingLocation,
    carCoverChoice: d.carCoverChoice,
    gateAccessConsent: d.gateAccessConsent,
    shift: d.shift,
    date: d.date,
    time: d.time,
    latitude: d.latitude,
    longitude: d.longitude,
    customFields: d.customFields,
  };
}

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "55%" : "-55%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? "-55%" : "55%", opacity: 0 }),
};

export default function BookingWizard() {
  const searchParams = useSearchParams();
  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<BookingData>({
    service: null,
    serviceOption: "",
    interiorAddOn: false,
    pkg: null,
    vehicleType: "",
    carBrand: "",
    carModel: "",
    carNumber: "",
    carId: null,
    carPrices: null,
    name: "",
    phone: "",
    pincode: "",
    address: "",
    parkingLocation: "",
    carCoverChoice: "",
    gateAccessConsent: false,
    date: "",
    time: "10:00 AM",
    shift: "",
    latitude: null,
    longitude: null,
    customFields: {},
    draftId: null,
  });

  // Hydrate from localStorage draft once on mount. Deep-link query params
  // below still override draft fields, so a fresh "Book Detailing" CTA always
  // lands on the right service even if the user had a half-filled draft.
  //
  // If the draft carries a `carId`, immediately refresh that car's prices from
  // the server. The cached snapshot is from whenever the user last picked the
  // car — admin price / MRP edits since then would otherwise stay invisible
  // to a returning user who never re-picks the car.
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    setData((d) => ({ ...d, ...draft }));
    const cachedCarId = draft.carId;
    if (!cachedCarId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cars/search?id=${encodeURIComponent(cachedCarId)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { cars?: CarRecord[] };
        const car = json.cars?.[0];
        if (cancelled) return;
        // Car deleted from catalog → clear the stale prices, force re-pick.
        if (!car) {
          setData((d) => (d.carId === cachedCarId ? { ...d, carPrices: null } : d));
          return;
        }
        setData((d) => (d.carId === cachedCarId ? { ...d, carPrices: pricesOf(car) } : d));
      } catch {
        // Network/transient error: leave the cached prices as-is rather than
        // wiping a user mid-flow.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change. Cheap; the form is small.
  useEffect(() => {
    writeDraft(data);
  }, [data]);

  // Server-side partial save. Mirrors the wizard into a `leads` row with
  // status="draft" as soon as *any* user-entered field has a value, then
  // debounces PUT updates as they keep typing. This is what lets admins see
  // incomplete attempts on /admin instead of losing them when a user bounces.
  //
  // `postingRef` gates the first POST so quick typing during the debounce
  // window can't race two inserts before the first returns its draftId.
  const postingRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasAnyData(data)) return;

    const payload = wizardToDraftPayload(data);
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        if (!data.draftId) {
          if (postingRef.current) return; // an earlier debounce is mid-flight
          postingRef.current = true;
          const res = await fetch("/api/booking/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          if (!res.ok) {
            postingRef.current = false; // allow a retry on next change
            return;
          }
          const json = (await res.json()) as { id?: string };
          if (json.id) setData((d) => ({ ...d, draftId: json.id! }));
        } else {
          // Subsequent edits — update by id. Server returns ok:false silently
          // if the row was already promoted by an earlier submit; we ignore.
          await fetch("/api/booking/draft", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.draftId, ...payload }),
            signal: controller.signal,
          });
        }
      } catch {
        // Network errors are non-fatal: the localStorage draft still holds
        // everything; the next change re-tries.
      }
    }, 800); // debounce so rapid typing doesn't fire dozens of requests

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [data]);

  useEffect(() => {
    // Legacy ?package= deep-link from older marketing links. Map to the new
    // serviceOption + service category model so the rest of the flow works.
    const pkg = searchParams.get("package");
    if (pkg === "Daily") {
      setData((d) => ({ ...d, pkg, service: "CarWash", serviceOption: "Monthly" }));
    } else if (pkg === "TriWeekly") {
      setData((d) => ({ ...d, pkg, service: "CarWash", serviceOption: "WeeklyThrice" }));
    } else if (pkg === "OneTime") {
      setData((d) => ({ ...d, pkg, service: "OneTimeCarWash", serviceOption: "OneTimeManual" }));
    }
    // Service deep-link from the home Pricing CTAs. Sets the category but not
    // the sub-option — the user picks that on Step 1.
    const svc = searchParams.get("service");
    if (svc === "CarWash") {
      setData((d) => ({ ...d, service: "CarWash", pkg: d.pkg ?? "Daily" }));
    } else if (svc === "CarDetailing") {
      setData((d) => ({ ...d, service: "CarDetailing" }));
    } else if (svc === "OneTimeCarWash") {
      setData((d) => ({ ...d, service: "OneTimeCarWash", pkg: "OneTime" }));
    }
  }, [searchParams]);

  function update(patch: Partial<BookingData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  // Scroll the whole page to the very top on step changes — scrolling the
  // wizard ref via scrollIntoView often does nothing because the wizard
  // already overlaps the viewport, leaving the user stranded mid-form. The
  // page-level scroll resets the booking header and progress bar back into
  // view, which is the visual signal that "you moved to a new step".
  function scrollTop() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    scrollTop();
  }

  function back() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 1));
    scrollTop();
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6" ref={topRef}>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8"
          >
            {step === 1 && <StepContact data={data} update={update} onNext={next} />}
            {step === 2 && <StepLocation data={data} update={update} onNext={next} onBack={back} />}
            {step === 3 && <StepVehicle data={data} update={update} onNext={next} onBack={back} />}
            {step === 4 && <StepPackage data={data} update={update} onNext={next} onBack={back} />}
            {step === 5 && <StepConfirm data={data} onBack={back} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
