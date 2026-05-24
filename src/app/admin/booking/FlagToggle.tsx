"use client";

import { useState } from "react";

/**
 * Compact on/off toggle with a hidden input so the value submits with the
 * parent <form>. Matches the rest of the admin toggle language (gold pill when
 * on; grey when off).
 */
export default function FlagToggle({
  name,
  label,
  help,
  defaultOn,
}: {
  name: string;
  label: string;
  help?: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm text-white/80">{label}</span>
        {help && <span className="block text-[11px] text-white/40">{help}</span>}
      </span>
      <input type="hidden" name={name} value={on ? "true" : "false"} />
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#C9A84C]" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </label>
  );
}
