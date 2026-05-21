"use client";

import { useState } from "react";
import {
  MapPin,
  Hash,
  CheckCircle,
  AlertTriangle,
  Loader2,
  LocateFixed,
} from "lucide-react";
import type { BookingData } from "./BookingWizard";
import { CATEGORY_COLORS } from "@/lib/pricing";
import {
  BUSINESS_LOCATION,
  SUPPORT_PHONE,
  haversineKm,
  radiusForService,
} from "@/lib/serviceability";

// Detect the user's platform so the recovery instructions match the menus
// they'll actually see. We can't open OS settings from the web, so the best
// we can do is name the right path. Falls back to a generic message when
// the UA isn't recognisable.
function blockedMessage(): string {
  if (typeof navigator === "undefined") return GENERIC_BLOCKED;
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) {
    return "Location is turned off for this site on iOS. To enable it: open the AA / page-settings menu next to the URL → Website Settings → Location → Allow. Or, in iOS Settings → Privacy & Security → Location Services → Safari → While Using the App. Then come back and tap the button again.";
  }
  if (/Android/.test(ua)) {
    return "Location is turned off for this site on Android. Tap the lock icon next to the URL → Permissions → Location → Allow. If Location is off system-wide, also enable it in Settings → Location, then tap the button again.";
  }
  if (/Mac OS X/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) {
    return "Location is blocked for this site in Safari. Open Safari → Settings → Websites → Location → set this site to Allow. Also confirm macOS System Settings → Privacy & Security → Location Services is on for Safari. Then tap the button again.";
  }
  if (/Chrome/.test(ua)) {
    return "Location is blocked for this site in Chrome. Click the lock icon next to the URL → Site settings → Location → Allow, then reload the page and tap the button again.";
  }
  if (/Firefox/.test(ua)) {
    return "Location is blocked for this site in Firefox. Click the lock icon next to the URL → Clear permission, then tap the button again and choose Allow when prompted.";
  }
  return GENERIC_BLOCKED;
}

const GENERIC_BLOCKED =
  "Location access is blocked for this site. Open your browser's site settings, allow Location for this site, then tap the button again.";

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type CheckState =
  | { status: "idle" }
  | { status: "done"; distanceKm: number };

export default function StepVehicle({ data, update, onNext, onBack }: Props) {
  const pin = data.pincode.trim();
  const pinLooksComplete = /^\d{6}$/.test(pin);
  const radiusKm = radiusForService(data.service);

  // Borders / selected-state tints follow the category color picked in Step 1
  // (blue for CarWash, green for CarDetailing, pink for OneTimeCarWash).
  const accent = data.service ? CATEGORY_COLORS[data.service] : "#C9A84C";
  const accent20 = `${accent}33`; // 20% alpha — focus ring / soft glow

  const [check, setCheck] = useState<CheckState>({ status: "idle" });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<
    | { kind: "blocked"; message: string }
    | { kind: "retry"; message: string }
    | null
  >(null);
  const [attempted, setAttempted] = useState(false);

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError({
        kind: "blocked",
        message:
          "Your browser doesn't support location access. Please open this site in Chrome, Safari, or another modern browser to continue.",
      });
      return;
    }

    // Always call getCurrentPosition — this is the only thing that actually
    // invokes the browser's native permission prompt and, on Android (and
    // some desktops), the OS "turn on location" dialog when device location is
    // off but the site is allowed. We deliberately do NOT short-circuit on a
    // Permissions API "denied" reading, because that would suppress a prompt
    // the browser might still be willing to show. We only consult the
    // Permissions API afterwards to tailor the recovery message.
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const distanceKm = haversineKm({ lat, lng }, BUSINESS_LOCATION);
        const rounded = Math.round(distanceKm * 10) / 10;
        setCheck({ status: "done", distanceKm: rounded });
        // Persist the actual coordinates onto the booking so the admin can
        // see the customer's location on a map — not just whether they're
        // in-range.
        update({ latitude: lat, longitude: lng });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          // Hard-denied (or device location off): the browser won't re-prompt,
          // so guide the user to re-enable it for their specific platform.
          setGeoError({ kind: "blocked", message: blockedMessage() });
        } else if (err.code === err.TIMEOUT) {
          setGeoError({
            kind: "retry",
            message: "Location request timed out. Please tap the button to try again.",
          });
        } else {
          // POSITION_UNAVAILABLE — often means device location services are
          // turned off. On Android the dialog above usually offers to enable
          // it; otherwise point the user at their device settings.
          setGeoError({
            kind: "blocked",
            message:
              "We couldn't get a location fix — your device's location/GPS may be turned off. " +
              "Turn on Location (Settings → Location on Android, Settings → Privacy & Security → " +
              "Location Services on iOS), then tap the button again.",
          });
        }
      },
      // Long timeout: on Android, getCurrentPosition pops the system
      // "Turn on location" dialog when device location is off; the user needs
      // time to read it, tap OK, and get a first fix before we give up.
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  }

  // A successful GPS read is the only way to clear this step — the form will
  // not let the user continue without it.
  const locationChecked = check.status === "done";
  const addressValid = data.address.trim().length >= 8;
  const valid = locationChecked && pinLooksComplete && addressValid;

  const errLocation = attempted && !locationChecked;
  const errPin      = attempted && !pinLooksComplete;
  const errAddress  = attempted && !addressValid;

  function handleContinue() {
    if (valid) {
      setAttempted(false);
      onNext();
    } else {
      setAttempted(true);
    }
  }

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
        className="w-full py-3 rounded-xl text-sm font-semibold text-white border disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        style={
          errLocation
            ? { borderColor: "rgba(248,113,113,0.70)", boxShadow: "0 0 0 1px rgba(248,113,113,0.30)", background: "rgba(255,255,255,0.02)" }
            : { borderColor: `${accent}66`, background: `${accent}0D` }
        }
      >
        {geoLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <LocateFixed size={14} style={{ color: accent }} />
        )}
        {geoLoading
          ? "Locating…"
          : check.status === "idle" && !geoError
          ? "Check availability with my location"
          : "Re-check using my location"}
      </button>
      {!locationChecked && !geoLoading && !geoError && (
        <p className={`text-[11px] mt-2 ${errLocation ? "text-red-300" : "text-white/40"}`}>
          Required — we use your location only to confirm we serve your area. Tap above to allow.
        </p>
      )}

      {check.status === "done" && check.distanceKm <= radiusKm && (
        <p className="flex items-center gap-1.5 text-[11px] mt-2" style={{ color: accent }}>
          <CheckCircle size={12} className="flex-shrink-0" />
          Great news — service is available in your area.
        </p>
      )}
      {check.status === "done" && check.distanceKm > radiusKm && (
        <div
          className="flex items-start gap-2 text-[11px] text-amber-300 mt-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.25)" }}
        >
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            Your location looks outside our current service area for this service.
            Please call us at{" "}
            <a href={`tel:${SUPPORT_PHONE.replace(/\s|\(|\)|-/g, "")}`} className="underline font-semibold">
              {SUPPORT_PHONE}
            </a>
            . You can still continue and we&apos;ll get back to you.
          </span>
        </div>
      )}
      {geoError?.kind === "retry" && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-300 mt-2">
          <AlertTriangle size={12} className="flex-shrink-0" /> {geoError.message}
        </p>
      )}
      {geoError?.kind === "blocked" && (
        <div
          className="flex items-start gap-2 text-[11px] text-amber-200 mt-2 px-3 py-2 rounded-lg leading-snug"
          style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.30)" }}
        >
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong className="text-amber-100">Location is required to continue.</strong>{" "}
            {geoError.message}
          </span>
        </div>
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
          onFocus={(e) => {
            if (!errPin) {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors ${
            errPin ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
          }`}
        />
        {errPin && <p className="text-[11px] text-red-300 mt-1">Enter a 6-digit pincode.</p>}
      </div>

      {/* Address */}
      <div className="mb-6">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <MapPin size={10} className="inline mr-1" /> Full Address *
        </label>
        <textarea
          rows={3}
          placeholder="Flat no, Building, Street, Area, City"
          value={data.address}
          onChange={(e) => update({ address: e.target.value })}
          onFocus={(e) => {
            if (!errAddress) {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors resize-none ${
            errAddress ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
          }`}
        />
        {errAddress && <p className="text-[11px] text-red-300 mt-1">Please enter your full address (at least 8 characters).</p>}
      </div>

      {attempted && !valid && (
        <p className="text-[12px] text-red-300 text-center mb-3">
          Please complete the highlighted fields above.
        </p>
      )}

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
          Continue →
        </button>
      </div>
    </div>
  );
}
