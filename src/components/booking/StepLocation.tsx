"use client";

import { useState } from "react";
import { MapPin, Hash, CheckCircle, AlertTriangle, Loader2, LocateFixed, Home, Trees, Check, Lock } from "lucide-react";
import type { BookingData } from "./BookingWizard";
import {
  BUSINESS_LOCATION,
  SUPPORT_PHONE,
  haversineKm,
  radiusForService,
} from "@/lib/serviceability";

// Service window: 8 PM – 10 AM (overnight). Hourly slots end-to-end.
const TIME_SLOTS = [
  "8:00 PM",  "9:00 PM",  "10:00 PM", "11:00 PM",
  "12:00 AM", "1:00 AM",  "2:00 AM",  "3:00 AM",
  "4:00 AM",  "5:00 AM",  "6:00 AM",  "7:00 AM",
  "8:00 AM",  "9:00 AM",  "10:00 AM",
];

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type CheckState =
  | { status: "idle" }
  | { status: "done"; distanceKm: number };

export default function StepLocation({ data, update, onNext, onBack }: Props) {
  const pin = data.pincode.trim();
  const pinLooksComplete = /^\d{6}$/.test(pin);
  const radiusKm = radiusForService(data.service);

  const [check, setCheck] = useState<CheckState>({ status: "idle" });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Your browser doesn't support location access.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distanceKm = haversineKm(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          BUSINESS_LOCATION,
        );
        const rounded = Math.round(distanceKm * 10) / 10;
        setCheck({ status: "done", distanceKm: rounded });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location access denied. You can still fill the form and we'll confirm by phone.");
        } else if (err.code === err.TIMEOUT) {
          setGeoError("Location request timed out. You can still fill the form and we'll confirm by phone.");
        } else {
          setGeoError("Couldn't get your location. You can still fill the form and we'll confirm by phone.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  // The GPS check is now compulsory — the user must either get a successful
  // reading OR see an explicit error (denied / unsupported / timeout). A
  // never-attempted check leaves them unable to continue. Outside-radius is
  // still allowed (we ask them to call us, but the form proceeds).
  const locationChecked = check.status === "done" || geoError !== null;
  const valid =
    pinLooksComplete &&
    data.address.trim().length >= 8 &&
    locationChecked &&
    data.parkingLocation !== "" &&
    data.gateAccessConsent &&
    data.date.length > 0;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Your Location
      </h2>
      <p className="text-white/45 text-sm mb-4">Our team will come to you — where should we head?</p>

      {/* Serviceability check — required to proceed */}
      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
        Availability Check *
      </p>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={geoLoading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white border border-[#C9A84C]/40 bg-[#C9A84C]/5 hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/70 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        {geoLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <LocateFixed size={14} className="text-[#C9A84C]" />
        )}
        {geoLoading
          ? "Locating…"
          : check.status === "idle" && !geoError
          ? "Check availability with my location"
          : "Re-check using my location"}
      </button>
      {!locationChecked && !geoLoading && (
        <p className="text-[11px] text-white/40 mt-2">
          Tap above to confirm we serve your area before continuing.
        </p>
      )}

      {check.status === "done" && check.distanceKm <= radiusKm && (
        <p className="flex items-center gap-1.5 text-[11px] text-[#C9A84C] mt-2">
          <CheckCircle size={12} className="flex-shrink-0" />
          Service available — about {check.distanceKm} km away (within {radiusKm} km).
        </p>
      )}
      {check.status === "done" && check.distanceKm > radiusKm && (
        <div
          className="flex items-start gap-2 text-[11px] text-amber-300 mt-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.25)" }}
        >
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            You&apos;re about {check.distanceKm} km away — outside our {radiusKm} km radius for this service.
            Please call us at{" "}
            <a href={`tel:${SUPPORT_PHONE.replace(/\s|\(|\)|-/g, "")}`} className="underline font-semibold">
              {SUPPORT_PHONE}
            </a>
            . You can still continue and we&apos;ll get back to you.
          </span>
        </div>
      )}
      {geoError && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-300 mt-2">
          <AlertTriangle size={12} className="flex-shrink-0" /> {geoError}
        </p>
      )}

      <div className="h-px bg-white/5 my-5" />

      {/* Pincode — collected, not used for the check */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <Hash size={10} className="inline mr-1" /> Pincode / Postcode *
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="e.g. 600001"
          value={data.pincode}
          onChange={(e) => update({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors"
        />
      </div>

      {/* Address */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <MapPin size={10} className="inline mr-1" /> Full Address *
        </label>
        <textarea
          rows={3}
          placeholder="Flat no, Building, Street, Area, City"
          value={data.address}
          onChange={(e) => update({ address: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors resize-none"
        />
      </div>

      {/* Parking — Inside / Outside */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          Where is the car parked? *
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "inside",  label: "Inside",  blurb: "Garage / basement", Icon: Home  },
            { id: "outside", label: "Outside", blurb: "Driveway / open",   Icon: Trees },
          ] as const).map(({ id, label, blurb, Icon }) => {
            const sel = data.parkingLocation === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update({ parkingLocation: id })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all min-h-[48px] ${
                  sel
                    ? "border-[#C9A84C] shadow-[0_0_14px_rgba(201,168,76,0.2)]"
                    : "glass-card hover:border-[#1A5FD4]/40"
                }`}
                style={sel ? { background: "rgba(201,168,76,0.08)" } : {}}
              >
                <Icon size={14} className={sel ? "text-[#C9A84C]" : "text-white/50"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 truncate">{blurb}</p>
                </div>
                {sel && (
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                       style={{ background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gate / access consent */}
      <button
        type="button"
        onClick={() => update({ gateAccessConsent: !data.gateAccessConsent })}
        className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border text-left mb-4 transition-all ${
          data.gateAccessConsent
            ? "border-[#C9A84C] bg-[rgba(201,168,76,0.08)]"
            : "glass-card hover:border-[#1A5FD4]/40"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border mt-0.5 ${
            data.gateAccessConsent ? "border-[#C9A84C]" : "border-white/25"
          }`}
          style={data.gateAccessConsent ? { background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" } : {}}
        >
          {data.gateAccessConsent && <Check size={11} className="text-[#050E21]" strokeWidth={3} />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white leading-tight flex items-center gap-1.5">
            <Lock size={11} className="text-[#C9A84C]" /> Gate / parking access *
          </p>
          <p className="text-[11px] text-white/55 mt-1 leading-snug">
            I confirm someone will arrange gate, security or parking-area access during the
            8 PM – 10 AM service window. If the gate is locked or restricted at the time of
            visit, the booking may be rescheduled.
          </p>
        </div>
      </button>

      {/* Date & Time — stacked on mobile, side-by-side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
            Preferred Date *
          </label>
          <input
            type="date"
            value={data.date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => update({ date: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
            Preferred Time (8 PM – 10 AM)
          </label>
          <select
            value={data.time}
            onChange={(e) => update({ time: e.target.value })}
            className="w-full bg-[#071F4A] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#C9A84C] transition-colors appearance-none cursor-pointer"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-semibold text-sm text-white/60 glass-card hover:text-white active:scale-95 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex-[2] py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
