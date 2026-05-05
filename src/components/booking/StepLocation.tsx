"use client";

import { MapPin, Hash } from "lucide-react";
import type { BookingData } from "./BookingWizard";

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepLocation({ data, update, onNext, onBack }: Props) {
  const valid = data.pincode.trim().length >= 4 && data.address.trim().length >= 8;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Your Location
      </h2>
      <p className="text-white/45 text-sm mb-5">Our team will come to you — where should we head?</p>

      {/* Pincode */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <Hash size={10} className="inline mr-1" /> Pincode / Postcode *
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="e.g. 560001"
          value={data.pincode}
          onChange={(e) => update({ pincode: e.target.value })}
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
          Review Booking →
        </button>
      </div>
    </div>
  );
}
