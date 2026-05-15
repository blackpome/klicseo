"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle, Car, User, MapPin, Calendar, Sparkles, Home, Sunrise, Sunset } from "lucide-react";
import TransformationLoop from "./TransformationLoop";
import type { BookingData } from "./BookingWizard";
import { clearBookingDraft } from "./BookingWizard";
import { SERVICE_OPTIONS, isServiceOptionId, priceFor, tierLabel, tierForVehicleType, inr, CATEGORY_COLORS } from "@/lib/pricing";

interface Props {
  data: BookingData;
  onBack: () => void;
}

const serviceLabel: Record<string, string> = {
  CarWash:        "Car Wash",
  CarDetailing:   "Car Detailing",
  OneTimeCarWash: "One-Time Car Wash",
};

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-white/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-medium text-white mt-0.5 break-words leading-snug">{value}</p>
      </div>
    </div>
  );
}

export default function StepConfirm({ data, onBack }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tier = tierForVehicleType(data.vehicleType);
  const optionDef = isServiceOptionId(data.serviceOption) ? SERVICE_OPTIONS[data.serviceOption] : null;
  const priced = priceFor(data.serviceOption, data.vehicleType, data.interiorAddOn, data.parkingLocation);
  const total = priced?.total ?? 0;
  const isMonthly = optionDef?.recurring === "monthly";

  async function handleSubmit() {
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, price: total }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        const msg = json?.error || `Booking failed (HTTP ${res.status}).`;
        setSubmitError(msg);
        setLoading(false);
        return;
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error — please try again.");
      setLoading(false);
      return;
    }
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      clearBookingDraft();
    }, 1200);
  }

  // Gold-themed confetti burst on success — fires once when the screen
  // transitions, layered as two angled bursts so it spreads across the
  // viewport rather than firing from a single point. Also scrolls the page
  // to the top so the confirmation hero (3D car + checkmark) is in view
  // rather than the user landing on the bottom-of-page submit button.
  useEffect(() => {
    if (!submitted) return;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const palette = ["#9C7A2A", "#C9A84C", "#E8CC7A", "#FFFFFF"];
    confetti({
      particleCount: 90,
      spread: 70,
      angle: 60,
      origin: { x: 0, y: 0.7 },
      colors: palette,
      scalar: 0.9,
    });
    confetti({
      particleCount: 90,
      spread: 70,
      angle: 120,
      origin: { x: 1, y: 0.7 },
      colors: palette,
      scalar: 0.9,
    });
    const t = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        startVelocity: 35,
        origin: { x: 0.5, y: 0.5 },
        colors: palette,
        scalar: 0.8,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [submitted]);

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-6"
      >
        <div className="w-full mb-6">
          <TransformationLoop />
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4"
          style={{ 
            background: `linear-gradient(135deg, ${data.service ? CATEGORY_COLORS[data.service] : "#9C7A2A"}, ${data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"})`,
            boxShadow: `0 0 40px ${data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"}66`
          }}
        >
          <CheckCircle size={30} className="text-[#050E21] sm:hidden" />
          <CheckCircle size={36} className="text-[#050E21] hidden sm:block" />
        </motion.div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
          Booking Confirmed!
        </h2>
        <p className="text-white/50 text-sm mb-1.5">
          Thank you, <span className="font-semibold" style={{ color: data.service ? CATEGORY_COLORS[data.service] : "#C9A84C" }}>{data.name}</span>. Our team will call you at your selected time.
        </p>
        <p className="text-white/35 text-xs">
          Confirmation sent to <span className="text-white/55">{data.phone}</span>
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Review & Confirm
      </h2>
      <p className="text-white/45 text-sm mb-4">Everything look right?</p>

      {/* Summary */}
      <div className="glass-card rounded-2xl px-3 py-0.5 mb-4">
        {data.service && (
          <Row
            icon={Sparkles}
            label="Service"
            value={[
              serviceLabel[data.service],
              optionDef?.label,
              data.interiorAddOn && optionDef?.addOn ? `+ ${optionDef.addOn.label}` : "",
            ].filter(Boolean).join(" · ")}
          />
        )}
        <Row
          icon={Car}
          label="Vehicle"
          value={[data.vehicleType, data.carModel, data.carNumber].filter(Boolean).join(" · ")}
        />
        <Row icon={User}    label="Contact"  value={`${data.name} · ${data.phone}`} />
        <Row icon={MapPin}  label="Location" value={`${data.address}, ${data.pincode}`} />
        {data.parkingLocation && (
          <Row
            icon={Home}
            label="Parking & Access"
            value={`${data.parkingLocation === "inside" ? "Inside (garage/basement)" : "Outside (driveway/open)"}${
              data.carCoverChoice === "yes"
                ? " · car cover available (Rs.100 discount)"
                : data.carCoverChoice === "no"
                ? " · no car cover (extra charges may apply)"
                : ""
            }${data.gateAccessConsent ? " · gate access confirmed" : ""}`}
          />
        )}
        {data.shift && (
          <Row
            icon={data.shift === "morning" ? Sunrise : Sunset}
            label="Service Shift"
            value={data.shift === "morning" ? "Morning Shift (4 AM – 10 AM)" : "Evening Shift (8 PM – 11 PM)"}
          />
        )}
        {data.date && (
          <Row icon={Calendar} label="Callback Time" value={`${data.date} at ${data.time}`} />
        )}
      </div>

      {/* Price */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
        style={{ 
          background: `${data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"}15`, 
          border: `1px solid ${data.service ? CATEGORY_COLORS[data.service] : "#C9A84C"}40` 
        }}
      >
        <div>
          <p className="text-white/60 text-sm leading-none">Total</p>
          <p className="text-white/35 text-[10px] mt-0.5">
            {isMonthly ? "per month" : "one time"} · {tierLabel[tier]}
            {data.parkingLocation === "outside" ? " · outside parked" : ""}
          </p>
        </div>
        <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: data.service ? CATEGORY_COLORS[data.service] : "#C9A84C" }}>
          {inr(total)}
        </span>
      </div>

      {submitError && (
        <div
          className="mb-3 px-3 py-2.5 rounded-xl text-[12px] leading-snug text-red-200"
          style={{
            background: "rgba(248, 113, 113, 0.10)",
            border: "1px solid rgba(248, 113, 113, 0.35)",
          }}
        >
          {submitError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-semibold text-sm text-white/60 glass-card hover:text-white active:scale-95 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-[2] py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 active:scale-[0.98] disabled:opacity-70"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-[#050E21]/30 border-t-[#050E21] animate-spin" />
              Confirming…
            </span>
          ) : (
            "Confirm Booking ✓"
          )}
        </button>
      </div>
    </div>
  );
}
