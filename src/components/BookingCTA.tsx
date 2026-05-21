"use client";

import { useState } from "react";
import { Calendar, Clock, Car, CheckCircle, Phone, Mail } from "lucide-react";

const packages = ["Essential", "Premium", "Prestige"];
const vehicleTypes = ["Sedan / Hatch", "SUV / 4WD", "Truck / Van", "Luxury / Exotic"];
const timeSlots = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function BookingCTA() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle: vehicleTypes[0],
    pkg: packages[1],
    date: "",
    time: timeSlots[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="booking" className="relative py-20 sm:py-28 px-4">
      {/* Rich background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #050E21 0%, #071F4A 50%, #050E21 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(26,95,212,0.18) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            Ready to Shine?
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Book Your Service
          </h2>
          <p className="text-white/50 max-w-lg mx-auto text-sm sm:text-base">
            Reserve your spot in minutes. We&apos;ll confirm within 30 minutes and
            arrive on time, every time.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Contact info sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-blue rounded-2xl p-6">
              <h3
                className="text-lg font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Why Book With Us?
              </h3>
              <ul className="space-y-3">
                {[
                  "Guaranteed satisfaction or free redo",
                  "Trained & insured professionals",
                  "Eco-friendly premium products",
                  "Doorstep service — we come to you",
                  "Flexible scheduling, 7 days",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                    <CheckCircle size={16} className="text-[#C9A84C] flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
                Contact Us
              </h3>
              <a href="tel:+917904332212" className="flex items-center gap-3 text-white hover:text-[#C9A84C] transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-[#1A5FD4]/20 flex items-center justify-center group-hover:bg-[#C9A84C]/20 transition-colors">
                  <Phone size={16} className="text-[#C9A84C]" />
                </div>
                <span className="font-medium">+91 79043 32212</span>
              </a>
              <a href="mailto:klicseo@gmail.com" className="flex items-center gap-3 text-white hover:text-[#C9A84C] transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-[#1A5FD4]/20 flex items-center justify-center group-hover:bg-[#C9A84C]/20 transition-colors">
                  <Mail size={16} className="text-[#C9A84C]" />
                </div>
                <span className="font-medium">klicseo@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Booking form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="glass-blue rounded-2xl p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-[#C9A84C]/20 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-[#C9A84C]" />
                </div>
                <h3
                  className="text-2xl font-bold text-white mb-3"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Booking Confirmed!
                </h3>
                <p className="text-white/60 mb-6">
                  Thank you, {form.name}! We&apos;ll send a confirmation to{" "}
                  <span className="text-[#C9A84C]">{form.email}</span> within
                  30 minutes.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Make another booking →
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="glass-card rounded-2xl p-6 sm:p-8 space-y-5"
              >
                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Smith"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#1A5FD4] focus:ring-1 focus:ring-[#1A5FD4]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+1 (000) 000-0000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#1A5FD4] focus:ring-1 focus:ring-[#1A5FD4]/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#1A5FD4] focus:ring-1 focus:ring-[#1A5FD4]/50 transition-colors"
                  />
                </div>

                {/* Vehicle & Package */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                      <Car size={12} className="inline mr-1" /> Vehicle Type
                    </label>
                    <select
                      value={form.vehicle}
                      onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                      className="w-full bg-[#071F4A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#1A5FD4] transition-colors appearance-none cursor-pointer"
                    >
                      {vehicleTypes.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                      Package
                    </label>
                    <select
                      value={form.pkg}
                      onChange={(e) => setForm({ ...form, pkg: e.target.value })}
                      className="w-full bg-[#071F4A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#1A5FD4] transition-colors appearance-none cursor-pointer"
                    >
                      {packages.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                      <Calendar size={12} className="inline mr-1" /> Preferred Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#1A5FD4] focus:ring-1 focus:ring-[#1A5FD4]/50 transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                      <Clock size={12} className="inline mr-1" /> Preferred Time
                    </label>
                    <select
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full bg-[#071F4A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#1A5FD4] transition-colors appearance-none cursor-pointer"
                    >
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl font-bold text-base text-[#050E21] shadow-[0_4px_24px_rgba(201,168,76,0.4)] hover:shadow-[0_8px_40px_rgba(201,168,76,0.6)] hover:scale-[1.02] transition-all duration-300 mt-2"
                  style={{
                    background: "linear-gradient(135deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
                  }}
                >
                  Confirm Booking
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
