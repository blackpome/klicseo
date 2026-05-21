"use client";

import { useState } from "react";
import { Check, X, Eye, EyeOff } from "lucide-react";

// Plain POST to /api/admin/reset so it still works without JS; the client bits
// only add live validation messages and a show/hide toggle.
export default function ResetForm({
  tokenHash,
  type,
  serverError,
}: {
  tokenHash: string;
  type: "invite" | "recovery";
  serverError?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const longEnough = password.length >= 8;
  const matches = confirm.length > 0 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = longEnough && matches;

  return (
    <form method="POST" action="/api/admin/reset" className="space-y-3">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name="password"
          placeholder="New password"
          autoFocus
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-11 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          title={show ? "Hide" : "Show"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <input
        type={show ? "text" : "password"}
        name="confirm"
        placeholder="Confirm password"
        required
        minLength={8}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30"
      />

      {/* Live requirement messages */}
      <ul className="space-y-1 text-[12px]">
        <Rule ok={longEnough} pending={password.length === 0}>At least 8 characters</Rule>
        <Rule ok={matches} pending={confirm.length === 0}>
          {mismatch ? "Passwords don’t match" : "Passwords match"}
        </Rule>
      </ul>

      {serverError && <p className="text-[12px] text-red-300">{serverError}</p>}

      <button
        type="submit"
        disabled={!valid}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        Save password
      </button>
    </form>
  );
}

function Rule({
  ok,
  pending,
  children,
}: {
  ok: boolean;
  pending: boolean;
  children: React.ReactNode;
}) {
  const color = pending ? "text-white/35" : ok ? "text-emerald-300" : "text-red-300";
  return (
    <li className={`flex items-center gap-1.5 ${color}`}>
      {pending ? (
        <span className="h-3.5 w-3.5 rounded-full border border-current opacity-50" />
      ) : ok ? (
        <Check size={14} />
      ) : (
        <X size={14} />
      )}
      {children}
    </li>
  );
}
