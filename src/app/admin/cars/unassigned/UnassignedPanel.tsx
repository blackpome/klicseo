"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Check } from "lucide-react";
import type { CarRecord } from "@/lib/carPricing";
import type { PriceTier } from "@/lib/priceTiers-shared";
import { assignCarsAction } from "../actions";

export default function UnassignedPanel({ cars, tiers, search }: { cars: CarRecord[]; tiers: PriceTier[]; search: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [tierId, setTierId] = useState<string>(tiers[0]?.id ?? "");
  const [searchInput, setSearchInput] = useState(search);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (searchInput) params.set("q", searchInput); else params.delete("q");
    router.replace(`?${params.toString()}`);
  };

  const handleAssign = () => {
    if (!tierId || picked.size === 0) return;
    const fd = new FormData();
    fd.set("tier_id", tierId);
    for (const id of picked) fd.append("car_ids", id);
    startTransition(async () => {
      await assignCarsAction(fd);
      setPicked(new Set());
      router.refresh();
    });
  };

  if (tiers.length === 0) {
    return <p className="text-sm text-white/50">Create a tier first, then come back here to assign cars.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold">Assign {picked.size > 0 ? `${picked.size} selected` : "selected"} to:</label>
        <select
          value={tierId}
          onChange={(e) => setTierId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9A84C]"
        >
          {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          onClick={handleAssign}
          disabled={pending || picked.size === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          <Check size={13} /> Assign
        </button>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="flex-1 max-w-sm flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C]">
          <Search size={14} className="ml-2 text-white/40" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search brand or model…"
            className="w-full bg-transparent px-2 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15">Search</button>
      </form>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        {cars.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-white/40">Nothing here — every car has a tier.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {cars.map((c) => {
              const on = picked.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${on ? "bg-[#C9A84C]/10" : "hover:bg-white/[0.03]"}`}
                  >
                    <span className={`grid h-4 w-4 place-items-center rounded border ${on ? "bg-[#C9A84C] border-[#C9A84C]" : "border-white/25"}`}>
                      {on && <Check size={11} className="text-[#050E21]" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{c.brand} {c.model}</span>
                      {c.body_type && <span className="text-white/35 text-xs ml-2">{c.body_type}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
