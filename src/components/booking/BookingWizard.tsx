"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import ProgressBar from "./ProgressBar";
import StepPackage from "./StepPackage";
import StepVehicle from "./StepVehicle";
import StepContact from "./StepContact";
import StepLocation from "./StepLocation";
import StepConfirm from "./StepConfirm";
import type { ServiceCategory } from "@/lib/pricing";

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
  carModel: string;
  carNumber: string;
  name: string;
  phone: string;
  otpVerified: boolean;
  pincode: string;
  address: string;
  parkingLocation: "" | "inside" | "outside";
  carCoverChoice: "" | "yes" | "no";
  gateAccessConsent: boolean;
  date: string;
  time: string;
}

const TOTAL_STEPS = 5;

// localStorage key for the in-progress booking draft. Survives page refresh
// so a 5-step form isn't punishing if the tab is reloaded mid-fill.
const DRAFT_KEY = "klicseo-booking-draft";

// otpVerified is excluded from the draft on purpose — phone re-verification
// must happen each session for security.
type DraftData = Omit<BookingData, "otpVerified">;

function readDraft(): Partial<DraftData> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<DraftData>) : null;
  } catch {
    return null;
  }
}

function writeDraft(data: BookingData) {
  if (typeof window === "undefined") return;
  try {
    const { otpVerified: _otp, ...rest } = data;
    void _otp;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
  } catch {
    // Storage may be full or disabled (private mode) — silently no-op.
  }
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
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
    carModel: "",
    carNumber: "",
    name: "",
    phone: "",
    otpVerified: false,
    pincode: "",
    address: "",
    parkingLocation: "",
    carCoverChoice: "",
    gateAccessConsent: false,
    date: "",
    time: "10:00 AM",
  });

  // Hydrate from localStorage draft once on mount. Deep-link query params
  // below still override draft fields, so a fresh "Book Detailing" CTA always
  // lands on the right service even if the user had a half-filled draft.
  useEffect(() => {
    const draft = readDraft();
    if (draft) setData((d) => ({ ...d, ...draft, otpVerified: false }));
  }, []);

  // Persist on every change. Cheap; the form is small.
  useEffect(() => {
    writeDraft(data);
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
      <ProgressBar current={step} />

      <div className="relative overflow-hidden mt-4">
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
