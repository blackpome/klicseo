"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Minus, Search, Check, ArrowRightLeft } from "lucide-react";
import type { CarRecord } from "@/lib/carPricing";
import type { PriceTier } from "@/lib/priceTiers-shared";
import { assignCarsAction, removeCarsFromTierAction } from "../../actions";

export default function TierCarsPanel({
  tierId,
  assigned,
  unassigned,
  allTiers,
  search,
}: {
  tierId: string;
  assigned: CarRecord[];
  unassigned: CarRecord[];
  allTiers: PriceTier[];
  search: string;
}) {
  const otherTiers = allTiers.filter((t) => t.id !== tierId);
  const router = useRouter();
  const sp = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set()); // add-picker
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set()); // bulk ops
  const [bulkTarget, setBulkTarget] = useState<string>("");
  const [searchInput, setSearchInput] = useState(search);
  const [pending, startTransition] = useTransition();

  const toggleAssigned = (id: string) =>
    setSelectedAssigned((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allAssignedSelected = assigned.length > 0 && assigned.every((c) => selectedAssigned.has(c.id));
  const toggleAllAssigned = (on: boolean) =>
    setSelectedAssigned(on ? new Set(assigned.map((c) => c.id)) : new Set());

  const togglePick = (id: string) =>
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

  const handleAdd = () => {
    if (picked.size === 0) return;
    const fd = new FormData();
    fd.set("tier_id", tierId);
    for (const id of picked) fd.append("car_ids", id);
    startTransition(async () => {
      await assignCarsAction(fd);
      setPicked(new Set());
      setPickerOpen(false);
      router.refresh();
    });
  };

  const handleMove = (carId: string, targetTierId: string) => {
    if (!targetTierId || targetTierId === tierId) return;
    const fd = new FormData();
    fd.set("tier_id", targetTierId);
    fd.append("car_ids", carId);
    startTransition(async () => {
      // assignCarsAction overwrites tier_id + mirrors the new tier's prices,
      // so reassignment = move.
      await assignCarsAction(fd);
      router.refresh();
    });
  };

  const handleRemove = (carId: string) => {
    const fd = new FormData();
    fd.set("tier_id", tierId);
    fd.append("car_ids", carId);
    startTransition(async () => {
      await removeCarsFromTierAction(fd);
      router.refresh();
    });
  };

  const handleBulkMove = () => {
    if (!bulkTarget || bulkTarget === tierId || selectedAssigned.size === 0) return;
    const fd = new FormData();
    fd.set("tier_id", bulkTarget);
    for (const id of selectedAssigned) fd.append("car_ids", id);
    startTransition(async () => {
      await assignCarsAction(fd);
      setSelectedAssigned(new Set());
      setBulkTarget("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Assigned cars */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white/[0.03]">
          <label className="inline-flex items-center gap-2 text-sm font-bold">
            {assigned.length > 0 && (
              <input
                type="checkbox"
                checked={allAssignedSelected}
                onChange={(e) => toggleAllAssigned(e.target.checked)}
                className="accent-[#C9A84C]"
                aria-label="Select all cars in this tier"
              />
            )}
            Cars in this tier <span className="text-white/40 font-normal">({assigned.length})</span>
          </label>
          {!pickerOpen && (
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#050E21]"
              style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
            >
              <Plus size={13} /> Add cars
            </button>
          )}
        </div>

        {/* Bulk-move bar — shows only when something is selected */}
        {selectedAssigned.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-[#C9A84C]/[0.06]">
            <span className="text-xs font-semibold">{selectedAssigned.size} selected</span>
            <span className="text-white/30">·</span>
            {otherTiers.length > 0 ? (
              <>
                <label className="inline-flex items-center gap-1 text-xs text-white/55">
                  <ArrowRightLeft size={12} className="text-white/40" /> Move to
                </label>
                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#C9A84C]"
                >
                  <option value="">Choose tier…</option>
                  {otherTiers.map((t) => <option key={t.id} value={t.id} className="bg-[#071029]">{t.name}</option>)}
                </select>
                <button
                  onClick={handleBulkMove}
                  disabled={pending || !bulkTarget}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
                >
                  <Check size={12} /> Move
                </button>
              </>
            ) : (
              <span className="text-xs text-white/40">No other tiers to move to — create one first.</span>
            )}
            <button onClick={() => setSelectedAssigned(new Set())} className="ml-auto text-xs text-white/50 hover:text-white">Clear</button>
          </div>
        )}

        {assigned.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-white/40">No cars yet — click <span className="text-white/70 font-semibold">Add cars</span> to assign.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {assigned.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.02]">
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedAssigned.has(c.id)}
                    onChange={() => toggleAssigned(c.id)}
                    className="accent-[#C9A84C]"
                    aria-label={`Select ${c.brand} ${c.model}`}
                  />
                  <div className="min-w-0">
                    <span className="font-medium">{c.brand} {c.model}</span>
                    {c.body_type && <span className="text-white/35 text-xs ml-2">{c.body_type}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {otherTiers.length > 0 && (
                    <label className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/55" title="Move this car to another tier">
                      <ArrowRightLeft size={11} className="text-white/40" />
                      <select
                        value=""
                        onChange={(e) => handleMove(c.id, e.target.value)}
                        disabled={pending}
                        className="bg-transparent text-[11px] focus:outline-none disabled:opacity-50"
                        aria-label={`Move ${c.brand} ${c.model} to another tier`}
                      >
                        <option value="" disabled>Move to…</option>
                        {otherTiers.map((t) => (
                          <option key={t.id} value={t.id} className="bg-[#071029]">{t.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={pending}
                    title="Remove from tier"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-white/50 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
                  >
                    <Minus size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Picker for unassigned cars */}
      {pickerOpen && (
        <div className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-bold">Add cars to this tier</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={pending || picked.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
              >
                <Check size={13} /> Add {picked.size > 0 ? `(${picked.size})` : ""}
              </button>
              <button onClick={() => { setPickerOpen(false); setPicked(new Set()); }} className="text-xs text-white/50 hover:text-white">Cancel</button>
            </div>
          </div>

          <form onSubmit={submitSearch} className="flex gap-2">
            <div className="flex-1 flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C]">
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

          <p className="text-[11px] text-white/40">Showing cars not yet assigned to any tier.</p>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
            {unassigned.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-white/40">No unassigned cars{search ? ` matching "${search}"` : ""}.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {unassigned.map((c) => {
                  const on = picked.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => togglePick(c.id)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${on ? "bg-[#C9A84C]/10" : "hover:bg-white/[0.03]"}`}
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
      )}
    </div>
  );
}
