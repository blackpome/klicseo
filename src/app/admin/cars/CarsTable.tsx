"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Check, AlertCircle, Tag } from "lucide-react";
import { PRICE_LINE_GROUPS, PRICE_LINE_LABEL, inr } from "@/lib/pricing";
import type { CarRecord } from "@/lib/carPricing";
import { bulkSetPricesAction, deleteCarAction } from "./actions";

const GROUP_MIN = 6; // a monthly price becomes its own tab only when MORE than 5 cars share it

function priceCell(v: number | null | undefined) {
  return v != null ? inr(v) : <span className="text-white/25">—</span>;
}

export default function CarsTable({ cars, grouped = false }: { cars: CarRecord[]; grouped?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all"); // "all" | "<price>" | "other"
  const [state, action, pending] = useActionState(bulkSetPricesAction, {} as { error?: string; ok?: string });

  // Monthly-price tabs: prices shared by 6+ cars, ascending.
  const { tabs, otherCount } = useMemo(() => {
    const counts = new Map<number, number>();
    let other = 0;
    for (const c of cars) {
      if (c.monthly == null) { other++; continue; }
      counts.set(c.monthly, (counts.get(c.monthly) ?? 0) + 1);
    }
    const tabList: { price: number; count: number }[] = [];
    for (const [price, count] of counts) {
      if (count >= GROUP_MIN) tabList.push({ price, count });
      else other += count;
    }
    tabList.sort((a, b) => a.price - b.price);
    return { tabs: tabList, otherCount: other };
  }, [cars]);

  const tabPrices = useMemo(() => new Set(tabs.map((t) => t.price)), [tabs]);

  const filtered = useMemo(() => {
    if (!grouped || filter === "all") return cars;
    if (filter === "other") return cars.filter((c) => c.monthly == null || !tabPrices.has(c.monthly));
    const price = Number(filter);
    return cars.filter((c) => c.monthly === price);
  }, [cars, grouped, filter, tabPrices]);

  const filteredIds = filtered.map((c) => c.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selectMany = (ids: string[], on: boolean) =>
    setSelected((p) => {
      const n = new Set(p);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });

  const renderPill = (id: string, label: string, count: number) => {
    const active = filter === id;
    return (
      <button
        key={id}
        onClick={() => setFilter(id)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
          active ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/5 text-white/60 hover:bg-white/10"
        }`}
      >
        {label} <span className={active ? "text-[#050E21]/60" : "text-white/35"}>{count}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Monthly-price filter tabs (like the leads status tabs) */}
      {grouped && tabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {renderPill("all", "All", cars.length)}
          {tabs.map((t) => renderPill(String(t.price), inr(t.price), t.count))}
          {otherCount > 0 && renderPill("other", "Other", otherCount)}
        </div>
      )}

      {/* Group-price panel — applies to whatever is selected */}
      {selected.size > 0 && (
        <form action={action} className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-4 space-y-3">
          {[...selected].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-[#C9A84C]" />
            <h2 className="text-sm font-bold">Set prices for {selected.size} selected car{selected.size > 1 ? "s" : ""}</h2>
          </div>
          <p className="text-[11px] text-white/45">Only the fields you fill in are applied. Leave the rest blank to keep them unchanged.</p>
          {PRICE_LINE_GROUPS.map((group) => (
            <div key={group.category}>
              <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5">{group.title}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {group.lines.map((line) => (
                  <label key={line} className="block">
                    <span className="text-[10px] text-white/40 block truncate">{PRICE_LINE_LABEL[line]}</span>
                    <div className="mt-0.5 flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C] overflow-hidden">
                      <span className="pl-2 text-xs text-white/40">₹</span>
                      <input type="text" inputMode="numeric" name={line} placeholder="—" className="w-full bg-transparent px-1.5 py-1.5 text-sm focus:outline-none" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg font-bold text-sm text-[#050E21] disabled:opacity-60" style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}>
              {pending ? "Applying…" : "Apply to selected"}
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-white/50 hover:text-white">Clear selection</button>
            {state.ok && <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300"><Check size={13} /> {state.ok}</span>}
            {state.error && <span className="inline-flex items-center gap-1 text-[12px] text-red-300"><AlertCircle size={13} /> {state.error}</span>}
          </div>
        </form>
      )}

      {/* Cars sheet */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-white/[0.03] text-white/45 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2.5 w-8">
                <input type="checkbox" checked={allSelected} onChange={(e) => selectMany(filteredIds, e.target.checked)} className="accent-[#C9A84C]" aria-label="Select all in view" />
              </th>
              <th className="text-left font-semibold px-3 py-2.5">Car</th>
              <th className="text-left font-semibold px-3 py-2.5">Body</th>
              <th className="text-right font-semibold px-3 py-2.5">Monthly</th>
              <th className="text-right font-semibold px-3 py-2.5">1× Manual</th>
              <th className="text-right font-semibold px-3 py-2.5">Detailing</th>
              <th className="text-right font-semibold px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-white/40 py-12">No cars here.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-[#C9A84C]" aria-label={`Select ${c.brand} ${c.model}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/cars/${c.id}/edit`} className="font-medium hover:text-[#C9A84C]">{c.brand} {c.model}</Link>
                    {c.segment_name && <div className="text-[11px] text-white/35">{c.segment_name}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-white/60">{c.body_type ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{priceCell(c.monthly)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{priceCell(c.one_time_manual)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{priceCell(c.car_detailing)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/admin/cars/${c.id}/edit`} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10"><Pencil size={14} /></Link>
                      <form action={deleteCarAction} onSubmit={(e) => { if (!confirm(`Delete ${c.brand} ${c.model}?`)) e.preventDefault(); }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button title="Delete" className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"><Trash2 size={14} /></button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
