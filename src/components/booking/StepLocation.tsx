"use client";

import { useState } from "react";
import { MapPin, Hash, CheckCircle, AlertTriangle, Loader2, LocateFixed, Home, Trees, Check, Lock, Clock, Sunrise, Sunset } from "lucide-react";
import type { BookingData } from "./BookingWizard";
import {
  BUSINESS_LOCATION,
  SUPPORT_PHONE,
  haversineKm,
  radiusForService,
} from "@/lib/serviceability";
import { CATEGORY_COLORS } from "@/lib/pricing";

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

// Callback availability slots. The service visit is confirmed later by the team.
const TIME_SLOTS = [
  "12:00 AM", "1:00 AM",  "2:00 AM",  "3:00 AM",
  "4:00 AM",  "5:00 AM",  "6:00 AM",  "7:00 AM",
  "8:00 AM",  "9:00 AM",  "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM",  "2:00 PM",  "3:00 PM",
  "4:00 PM",  "5:00 PM",  "6:00 PM",  "7:00 PM",
  "8:00 PM",  "9:00 PM",  "10:00 PM", "11:00 PM",
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

  // Step 2 borders / selected-state tints follow the category color picked
  // in Step 1 (blue for CarWash, green for CarDetailing, pink for
  // OneTimeCarWash) — never gold. Decorative label icons and the bottom
  // Continue button keep their existing brand-gold to stay consistent with
  // the rest of the wizard.
  const accent = data.service ? CATEGORY_COLORS[data.service] : "#C9A84C";
  const accent20 = `${accent}33`; // 20% alpha — focus ring / soft glow

  const [check, setCheck] = useState<CheckState>({ status: "idle" });
  const [geoLoading, setGeoLoading] = useState(false);
  // `blocked` means the browser/OS has denied permission and the user must
  // re-enable it in settings — only this state surfaces the long recovery
  // note. `retry` means a transient failure (timeout / position unavailable):
  // we just nudge them to tap again, no settings wall.
  const [geoError, setGeoError] = useState<
    | { kind: "blocked"; message: string }
    | { kind: "retry"; message: string }
    | null
  >(null);
  const [attempted, setAttempted] = useState(false);

  async function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError({
        kind: "blocked",
        message:
          "Your browser doesn't support location access. Please open this site in Chrome, Safari, or another modern browser to continue.",
      });
      return;
    }

    // Pre-flight permission check. Browsers (especially mobile Chrome/Safari)
    // remember a previous denial and silently reject getCurrentPosition
    // without re-prompting — querying the Permissions API up front lets us
    // surface explicit recovery instructions instead of leaving the user
    // staring at a button that does nothing.
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (status.state === "denied") {
          setGeoError({ kind: "blocked", message: blockedMessage() });
          return;
        }
      } catch {
        // Older mobile Safari builds don't support querying 'geolocation' via
        // the Permissions API. Fall through — getCurrentPosition will still
        // surface PERMISSION_DENIED below if appropriate.
      }
    }

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
          setGeoError({ kind: "blocked", message: blockedMessage() });
        } else if (err.code === err.TIMEOUT) {
          setGeoError({
            kind: "retry",
            message: "Location request timed out. Please tap the button to try again.",
          });
        } else {
          setGeoError({
            kind: "retry",
            message: "Couldn't read your location. Please tap the button to try again.",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  // A successful GPS read is the only way to clear this step — the form will
  // not let the user continue without it. Blocked / retry errors surface
  // guidance but do not unlock the Continue button.
  const locationChecked = check.status === "done";
  const addressValid = data.address.trim().length >= 8;
  const valid =
    pinLooksComplete &&
    addressValid &&
    locationChecked &&
    data.parkingLocation !== "" &&
    (data.parkingLocation !== "outside" || data.carCoverChoice !== "") &&
    data.gateAccessConsent &&
    data.shift !== "" &&
    data.date.length > 0;

  const errLocation = attempted && !locationChecked;
  const errPin      = attempted && !pinLooksComplete;
  const errAddress  = attempted && !addressValid;
  const errParking  = attempted && data.parkingLocation === "";
  const errCarCover = attempted && data.parkingLocation === "outside" && data.carCoverChoice === "";
  const errGate     = attempted && !data.gateAccessConsent;
  const errShift    = attempted && data.shift === "";
  const errDate     = attempted && data.date.length === 0;

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
      <div className="mb-4">
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

      {/* Parking — Inside / Outside */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          Where is the car parked? *
        </p>
        <div className={`grid grid-cols-2 gap-2 ${errParking ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
          {([
            { id: "inside",  label: "Inside",  blurb: "Garage / basement", Icon: Home  },
            { id: "outside", label: "Outside", blurb: "Driveway / open",   Icon: Trees },
          ] as const).map(({ id, label, blurb, Icon }) => {
            const sel = data.parkingLocation === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  update({
                    parkingLocation: id,
                    carCoverChoice: id === "outside" ? data.carCoverChoice : "",
                  })
                }
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all min-h-[48px] ${
                  sel ? "" : "glass-card hover:border-[#1A5FD4]/40"
                }`}
                style={
                  sel
                    ? { borderColor: accent, background: `${accent}14`, boxShadow: `0 0 14px ${accent20}` }
                    : {}
                }
              >
                <Icon size={14} style={sel ? { color: accent } : undefined} className={sel ? "" : "text-white/50"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 truncate">{blurb}</p>
                </div>
                {sel && (
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accent }} />
                )}
              </button>
            );
          })}
        </div>
        {errParking && <p className="text-[11px] text-red-300 mt-2">Pick where the car will be parked.</p>}
      </div>

      {data.parkingLocation === "outside" && (
        <>
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
              Do you have a car cover? *
            </p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${errCarCover ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
              {([
                {
                  id: "yes",
                  title: "Yes, I have one",
                  note: "Get a Rs.100 discount",
                  warning: "Even after cleaning, the car cover may carry dust, so the car may collect dust again.",
                },
                {
                  id: "no",
                  title: "No car cover",
                  note: "Extra charges may apply",
                  warning: "",
                },
              ] as const).map((option) => {
                const sel = data.carCoverChoice === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ carCoverChoice: option.id })}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      sel ? "" : "glass-card hover:border-[#1A5FD4]/40"
                    }`}
                    style={
                      sel
                        ? { borderColor: accent, background: `${accent}1A`, boxShadow: `0 0 14px ${accent}29` }
                        : {}
                    }
                  >
                    <p className="text-sm font-semibold text-white">{option.title}</p>
                    <p
                      className={`mt-1 text-[11px] ${option.id === "yes" ? "" : "text-red-300"}`}
                      style={option.id === "yes" ? { color: accent } : undefined}
                    >
                      {option.note}
                    </p>
                    {option.warning && (
                      <p className="mt-1.5 text-[11px] leading-snug text-red-300">
                        {option.warning}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {errCarCover && <p className="text-[11px] text-red-300 mt-2">Choose whether you have a car cover.</p>}
          </div>

          <div
            className="mb-4 rounded-xl px-3 py-3 text-[11px] leading-snug text-red-200"
            style={{
              background: "rgba(248, 113, 113, 0.10)",
              border: "1px solid rgba(248, 113, 113, 0.35)",
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-300" />
              <div>
                <p className="font-semibold text-red-100 mb-1">Car cover required</p>
                <p>
                  If the car is parked outside, a car cover is mandatory. Without a cover,
                  extra charges may apply based on the car&apos;s condition.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Gate / access consent */}
      <button
        type="button"
        onClick={() => update({ gateAccessConsent: !data.gateAccessConsent })}
        className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border text-left mb-4 transition-all ${
          data.gateAccessConsent
            ? ""
            : errGate
            ? "border-red-400/70 ring-1 ring-red-400/30 bg-white/[0.04]"
            : "glass-card hover:border-[#1A5FD4]/40"
        }`}
        style={data.gateAccessConsent ? { borderColor: accent, background: `${accent}14` } : {}}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border mt-0.5"
          style={
            data.gateAccessConsent
              ? { borderColor: accent, background: accent }
              : { borderColor: "rgba(255,255,255,0.25)" }
          }
        >
          {data.gateAccessConsent && <Check size={11} className="text-white" strokeWidth={3} />}
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
          {errGate && <p className="text-[11px] text-red-300 mt-2">Tick this box to confirm gate access.</p>}
        </div>
      </button>

      {/* Service shift */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          Preferred service shift *
        </p>
        <div className={`grid grid-cols-2 gap-2 ${errShift ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
          {([
            {
              id: "morning",
              label: "Morning Shift",
              blurb: "4 AM – 10 AM",
              Icon: Sunrise,
              recommended: false,
            },
            {
              id: "evening",
              label: "Evening Shift",
              blurb: "8 PM – 11 PM",
              Icon: Sunset,
              recommended: true,
            },
          ] as const).map(({ id, label, blurb, Icon, recommended }) => {
            const sel = data.shift === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update({ shift: id })}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all min-h-[56px] ${
                  sel ? "" : "glass-card hover:border-[#1A5FD4]/40"
                }`}
                style={
                  sel
                    ? { borderColor: accent, background: `${accent}14`, boxShadow: `0 0 14px ${accent20}` }
                    : {}
                }
              >
                {recommended && (
                  <span
                    className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase text-[#050E21] whitespace-nowrap shadow-[0_2px_8px_rgba(201,168,76,0.4)]"
                    style={{ background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }}
                  >
                    Recommended
                  </span>
                )}
                <Icon size={14} style={sel ? { color: accent } : undefined} className={sel ? "" : "text-white/50"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 truncate">{blurb}</p>
                </div>
                {sel && (
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accent }} />
                )}
              </button>
            );
          })}
        </div>
        {errShift && <p className="text-[11px] text-red-300 mt-2">Pick a service shift.</p>}
      </div>

      {/* Callback availability */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          When should our team call you? *
        </label>
        <p className="text-[11px] text-white/45 mb-2">
          Choose a date when you&apos;re free for a quick confirmation call.
        </p>
        <input
          type="date"
          value={data.date}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => update({ date: e.target.value })}
          onFocus={(e) => {
            if (!errDate) {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors [color-scheme:dark] ${
            errDate ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
          }`}
        />
        {errDate && <p className="text-[11px] text-red-300 mt-1">Pick a callback date.</p>}
      </div>

      {/* Compact callback-time picker. */}
      <div className="mb-6">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          Your free time for the call
        </label>
        <div className="relative">
          <Clock
            size={14}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C9A84C]"
          />
          <select
            value={data.time}
            onChange={(e) => update({ time: e.target.value })}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.boxShadow = "";
            }}
            className="w-full appearance-none rounded-xl border border-white/10 bg-[#071F4A] py-3.5 pl-10 pr-10 text-sm font-semibold text-white focus:outline-none [color-scheme:dark]"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/35">
            ▼
          </span>
        </div>
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
