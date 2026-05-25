"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Minus, Search, Check, ArrowRightLeft, Sheet as SheetIcon } from "lucide-react";
import type { CarRecord } from "@/lib/carPricing";
import type { PriceTier } from "@/lib/priceTiers-shared";
import { assignCarsAction, removeCarsFromTierAction } from "../../actions";

export default function TierCarsPanel({
  tierId,
  assigned,
  allTiers,
}: {
  tierId: string;
  assigned: CarRecord[];
  allTiers: PriceTier[];
}) {
  const otherTiers = allTiers.filter((t) => t.id !== tierId);
  // Tier name lookup for the picker's "currently in: <tier>" badge.
  const tierNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTiers) m.set(t.id, t.name);
    return m;
  }, [allTiers]);
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set()); // add-picker
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set()); // bulk ops
  const [bulkTarget, setBulkTarget] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [pickerResults, setPickerResults] = useState<CarRecord[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Live debounced search for the picker. Empty query → all cars (capped 500),
  // so admins can browse the full catalog and move cars from any tier; typed
  // query → fuzzy search via the same backend the booking flow uses.
  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    const q = searchInput.trim();
    const url = q ? `/api/cars/search?q=${encodeURIComponent(q)}&limit=200` : `/api/cars/search?all=1`;
    setPickerLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as { cars?: CarRecord[] };
        if (!cancelled) setPickerResults(json.cars ?? []);
      } catch {
        if (!cancelled) setPickerResults([]);
      } finally {
        if (!cancelled) setPickerLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [pickerOpen, searchInput]);

  // Exclude cars already in this tier — they can't usefully be "added" again.
  const assignedHere = useMemo(() => new Set(assigned.map((c) => c.id)), [assigned]);
  const pickerVisible = useMemo(
    () => pickerResults.filter((c) => !assignedHere.has(c.id)),
    [pickerResults, assignedHere],
  );

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

  const handleBulkRemove = () => {
    if (selectedAssigned.size === 0) return;
    if (!window.confirm(`Remove ${selectedAssigned.size} car${selectedAssigned.size === 1 ? "" : "s"} from this tier? They'll keep their previous prices but become unassigned.`)) return;
    const fd = new FormData();
    fd.set("tier_id", tierId);
    for (const id of selectedAssigned) fd.append("car_ids", id);
    startTransition(async () => {
      await removeCarsFromTierAction(fd);
      setSelectedAssigned(new Set());
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
            <div className="flex items-center gap-1.5">
              <Link
                href={`/admin/cars/bulk?tier=${tierId}`}
                title="Add multiple new cars at once (spreadsheet-style), pre-assigned to this tier"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
              >
                <SheetIcon size={13} /> Bulk add
              </Link>
              <button
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#050E21]"
                style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
              >
                <Plus size={13} /> Add cars
              </button>
            </div>
          )}
        </div>

        {/* Bulk-action bar — shows only when something is selected */}
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
                <span className="text-white/30">·</span>
              </>
            ) : null}
            <button
              onClick={handleBulkRemove}
              disabled={pending}
              title="Remove selected cars from this tier (they become unassigned)"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-300 ring-1 ring-red-500/25 hover:bg-red-500/25 disabled:opacity-50"
            >
              <Minus size={12} /> Remove from tier
            </button>
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

          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C]">
            <Search size={14} className="ml-2 text-white/40" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search brand or model — type to filter live"
              className="w-full bg-transparent px-2 py-1.5 text-sm focus:outline-none"
              autoFocus
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="px-2 text-xs text-white/45 hover:text-white"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <p className="text-[11px] text-white/40">
            Showing every car. Cars already in another tier are tagged — picking
            them here moves them into this one.
          </p>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
            {pickerLoading && pickerVisible.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-white/40">Loading…</p>
            ) : pickerVisible.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-white/40">
                No cars{searchInput ? ` matching “${searchInput}”` : ""}.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {pickerVisible.map((c) => {
                  const on = picked.has(c.id);
                  const currentTierName = c.tier_id ? tierNameById.get(c.tier_id) : null;
                  const inOtherTier = !!currentTierName && c.tier_id !== tierId;
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
                        <span className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="font-medium truncate">{c.brand} {c.model}</span>
                          {c.body_type && <span className="text-white/35 text-xs truncate">{c.body_type}</span>}
                        </span>
                        {inOtherTier ? (
                          <span
                            className="ml-2 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-400/20"
                            title={`Currently in ${currentTierName}`}
                          >
                            <ArrowRightLeft size={10} />
                            {currentTierName}
                          </span>
                        ) : c.tier_id == null ? (
                          <span className="ml-2 text-[10px] text-white/35">unassigned</span>
                        ) : null}
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
