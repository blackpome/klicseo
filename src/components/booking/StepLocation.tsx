"use client";

import { useState } from "react";
import { MapPin, Hash, CheckCircle, AlertTriangle, Loader2, LocateFixed } from "lucide-react";
import type { BookingData } from "./BookingWizard";
import {
  BUSINESS_LOCATION,
  SUPPORT_PHONE,
  haversineKm,
  radiusForService,
} from "@/lib/serviceability";

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

  // Pincode + address are required for delivery; serviceability never blocks the form.
  const valid = pinLooksComplete && data.address.trim().length >= 8;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Your Location
      </h2>
      <p className="text-white/45 text-sm mb-4">Our team will come to you — where should we head?</p>

      {/* Serviceability check — driven only by GPS */}
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
          : check.status === "idle"
          ? "Check availability with my location"
          : "Re-check using my location"}
      </button>

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
            Preferred Time
          </label>
          <select
            value={data.time}
            onChange={(e) => update({ time: e.target.value })}
            className="w-full bg-[#071F4A] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#C9A84C] transition-colors appearance-none cursor-pointer"
          >
            {["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"].map((t) => (
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
