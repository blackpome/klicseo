"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Check, AlertCircle, Sheet as SheetIcon, Copy, ChevronsDown } from "lucide-react";
import type { PriceTier } from "@/lib/priceTiers-shared";
import { bulkCreateCarsAction } from "../actions";

interface Row {
  /** Stable client-side row id (not the saved car id). */
  rid: string;
  brand: string;
  model: string;
  body_type: string;
  segment_name: string;
  tier_id: string;
}

const BODY_TYPES = ["Hatchback", "Sedan", "Compact SUV", "SUV", "XUV & Large SUV", "MUV", "Luxury"];

// Stable seed IDs for the initial render so the server and client agree on
// the markup (Math.random would give different IDs on each side → hydration
// mismatch). Generated row IDs after mount use makeRid().
function seedRow(idx: number, tierId: string = ""): Row {
  return { rid: `seed-${idx}`, brand: "", model: "", body_type: "", segment_name: "", tier_id: tierId };
}
function makeRid(): string {
  return Math.random().toString(36).slice(2, 10);
}
function emptyRow(tierId: string = ""): Row {
  return { rid: makeRid(), brand: "", model: "", body_type: "", segment_name: "", tier_id: tierId };
}

export default function BulkCarsSheet({
  tiers,
  defaultTierId = "",
  existingCars = [],
}: {
  tiers: PriceTier[];
  defaultTierId?: string;
  /** Brand+model pairs from the existing catalog, used for in-cell autocomplete. */
  existingCars?: Array<{ brand: string; model: string }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 5 }, (_, i) => seedRow(i, defaultTierId)));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: string; error?: string } | null>(null);

  const setRow = (rid: string, patch: Partial<Row>) =>
    setRows((p) => p.map((r) => (r.rid === rid ? { ...r, ...patch } : r)));

  const addRow = () => setRows((p) => [...p, emptyRow(defaultTierId)]);
  const addManyRows = (n: number) => setRows((p) => [...p, ...Array.from({ length: n }, () => emptyRow(defaultTierId))]);
  const removeRow = (rid: string) =>
    setRows((p) => (p.length > 1 ? p.filter((r) => r.rid !== rid) : p.map((r) => (r.rid === rid ? emptyRow(defaultTierId) : r))));

  /** Clone a row's brand/model into a fresh row inserted right below. */
  const duplicateRow = (rid: string) => {
    setRows((p) => {
      const idx = p.findIndex((r) => r.rid === rid);
      if (idx < 0) return p;
      const src = p[idx];
      const clone: Row = { ...src, rid: makeRid() };
      const next = [...p];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  /** Copy this row's brand into every subsequent row whose brand is empty. */
  const fillBrandDown = (rid: string) => {
    setRows((p) => {
      const idx = p.findIndex((r) => r.rid === rid);
      const brand = p[idx]?.brand.trim();
      if (idx < 0 || !brand) return p;
      let touched = 0;
      const next = p.map((r, i) => {
        if (i <= idx) return r;
        if (r.brand.trim()) return r;
        touched++;
        return { ...r, brand };
      });
      return touched > 0 ? next : p;
    });
  };

  // Autocomplete data: distinct brands + per-brand model list, built once from
  // the existing catalog. Wired into the Brand and Model inputs via <datalist>
  // so the browser handles the search-as-you-type UI natively.
  const allBrands = useMemo(() => {
    const set = new Set<string>();
    for (const c of existingCars) if (c.brand.trim()) set.add(c.brand);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [existingCars]);
  const modelsByBrand = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of existingCars) {
      const b = c.brand.trim().toLowerCase();
      if (!b || !c.model.trim()) continue;
      const list = m.get(b) ?? [];
      if (!list.includes(c.model)) list.push(c.model);
      m.set(b, list);
    }
    for (const list of m.values()) list.sort((a, b) => a.localeCompare(b));
    return m;
  }, [existingCars]);

  // Paste support: if the user pastes a multi-row block (tab-separated cells,
  // newline-separated rows) into the Brand cell of a row, expand into multiple
  // rows starting at that position.
  const handlePaste = (rid: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text || !/[\t\n]/.test(text)) return; // single-cell paste: let default happen
    e.preventDefault();
    const incoming = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
    const parsed: Row[] = incoming.map((line) => {
      const [brand = "", model = "", body_type = "", segment_name = ""] = line.split("\t");
      return { rid: makeRid(), brand: brand.trim(), model: model.trim(), body_type: body_type.trim(), segment_name: segment_name.trim(), tier_id: defaultTierId };
    });
    setRows((p) => {
      const idx = p.findIndex((r) => r.rid === rid);
      if (idx < 0) return [...p, ...parsed];
      const next = [...p];
      // Replace the row at idx with the first parsed row, then insert the rest.
      next.splice(idx, 1, ...parsed);
      // Ensure at least one trailing empty row.
      if (!next[next.length - 1] || (next[next.length - 1].brand || next[next.length - 1].model)) next.push(emptyRow(defaultTierId));
      return next;
    });
  };

  const nonEmpty = useMemo(() => rows.filter((r) => r.brand.trim() && r.model.trim()), [rows]);

  const onSave = () => {
    setFeedback(null);
    const payload = nonEmpty.map((r) => ({
      brand: r.brand.trim(),
      model: r.model.trim(),
      body_type: r.body_type.trim() || null,
      segment_name: r.segment_name.trim() || null,
      tier_id: r.tier_id || null,
    }));
    if (payload.length === 0) {
      setFeedback({ error: "Add at least one row with brand + model." });
      return;
    }
    startTransition(async () => {
      const res = await bulkCreateCarsAction(payload);
      if (res.error) setFeedback({ error: res.error });
      else {
        setFeedback({ ok: `Added ${res.ok!.created} car${res.ok!.created === 1 ? "" : "s"}${res.ok!.skipped ? ` (${res.ok!.skipped} blank row${res.ok!.skipped === 1 ? "" : "s"} skipped)` : ""}.` });
        // After save, reseed with stable IDs again (reset = back to initial state).
        setRows(Array.from({ length: 5 }, (_, i) => seedRow(i, defaultTierId)));
        router.refresh();
      }
    });
  };

  const tdInput = "w-full bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:bg-white/[0.04]";
  // When the page is opened from a tier's Manage cars, every row is already
  // pinned to that tier — the Tier column would just be visual noise.
  const showTierCol = !defaultTierId;

  return (
    <div className="space-y-3">
      {/* Shared brand suggestions for every row. */}
      <datalist id="bulk-brands">
        {allBrands.map((b) => <option key={b} value={b} />)}
      </datalist>
      <div className="flex items-start gap-2 rounded-lg border border-[#C9A84C]/20 bg-[#C9A84C]/[0.05] p-2.5 text-[11px] text-white/60">
        <SheetIcon size={13} className="text-[#C9A84C] shrink-0 mt-0.5" />
        <p>
          Type or paste rows (tab-separated). The Brand and Model cells autocomplete from the existing catalog — keep typing or pick a suggestion to avoid duplicates. <span className="inline-flex items-center gap-1 text-white/75"><Copy size={10} /> duplicate</span> clones the row below; <span className="inline-flex items-center gap-1 text-[#E8CC7A]"><ChevronsDown size={11} /> fill brand down</span> copies this brand into every empty row below. Blank rows are skipped on save.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-white/[0.03] text-white/45 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="sticky left-0 bg-[#071228] z-20 text-right font-semibold px-2 py-2 w-10 min-w-[40px] border-r border-white/[0.04]">#</th>
              <th className="text-left font-semibold px-2 py-2">Brand *</th>
              <th className="text-left font-semibold px-2 py-2">Model *</th>
              <th className="text-left font-semibold px-2 py-2">Body type</th>
              <th className="text-left font-semibold px-2 py-2">Segment</th>
              {showTierCol && <th className="text-left font-semibold px-2 py-2">Tier</th>}
              <th className="text-right font-semibold px-2 py-2 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const modelList = modelsByBrand.get(r.brand.trim().toLowerCase()) ?? [];
              return (
                <tr key={r.rid} className="group border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="sticky left-0 z-10 w-10 min-w-[40px] bg-[#050E21] group-hover:bg-[#091733] px-2 py-1 text-right text-white/35 tabular-nums border-r border-white/[0.04]">{i + 1}</td>
                  <td className="px-2 py-1">
                    <input
                      value={r.brand}
                      onChange={(e) => setRow(r.rid, { brand: e.target.value })}
                      onPaste={(e) => handlePaste(r.rid, e)}
                      placeholder="e.g. Honda"
                      list="bulk-brands"
                      className={tdInput}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={r.model}
                      onChange={(e) => setRow(r.rid, { model: e.target.value })}
                      placeholder="e.g. City"
                      list={`bulk-models-${r.rid}`}
                      className={tdInput}
                    />
                    <datalist id={`bulk-models-${r.rid}`}>
                      {modelList.map((m) => <option key={m} value={m} />)}
                    </datalist>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={r.body_type}
                      list={`bt-${r.rid}`}
                      onChange={(e) => setRow(r.rid, { body_type: e.target.value })}
                      placeholder="—"
                      className={tdInput}
                    />
                    <datalist id={`bt-${r.rid}`}>
                      {BODY_TYPES.map((b) => <option key={b} value={b} />)}
                    </datalist>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={r.segment_name}
                      onChange={(e) => setRow(r.rid, { segment_name: e.target.value })}
                      placeholder="—"
                      className={tdInput}
                    />
                  </td>
                  {showTierCol && (
                    <td className="px-2 py-1">
                      <select
                        value={r.tier_id}
                        onChange={(e) => setRow(r.rid, { tier_id: e.target.value })}
                        className="w-full bg-transparent px-1 py-1.5 text-xs focus:outline-none focus:bg-white/[0.04]"
                      >
                        <option value="">—</option>
                        {tiers.map((t) => <option key={t.id} value={t.id} className="bg-[#050E21]">{t.name}</option>)}
                      </select>
                    </td>
                  )}
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => duplicateRow(r.rid)}
                        title="Duplicate row — clone brand + model into a new row below"
                        disabled={!r.brand.trim() && !r.model.trim()}
                        className="grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-30"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => fillBrandDown(r.rid)}
                        title="Fill brand down — copy this brand into every empty row below"
                        disabled={!r.brand.trim()}
                        className="grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:bg-[#C9A84C]/15 hover:text-[#E8CC7A] disabled:opacity-30"
                      >
                        <ChevronsDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(r.rid)}
                        title="Remove row"
                        className="grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:bg-red-500/15 hover:text-red-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addRow()}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold"
          >
            <Plus size={13} /> Add row
          </button>
          <button
            type="button"
            onClick={() => addManyRows(10)}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold"
          >
            +10 rows
          </button>
          <span className="text-[11px] text-white/35">{nonEmpty.length} ready to save</span>
        </div>
        <div className="flex items-center gap-3">
          {feedback?.ok && <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300"><Check size={13} /> {feedback.ok}</span>}
          {feedback?.error && <span className="inline-flex items-center gap-1 text-[12px] text-red-300"><AlertCircle size={13} /> {feedback.error}</span>}
          <Link href="/admin/cars" className="text-xs text-white/50 hover:text-white">Done</Link>
          <button
            type="button"
            onClick={onSave}
            disabled={pending || nonEmpty.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-[#050E21] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            <Check size={14} /> {pending ? "Saving…" : `Save ${nonEmpty.length} car${nonEmpty.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

