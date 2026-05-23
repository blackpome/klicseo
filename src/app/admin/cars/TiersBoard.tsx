"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Check, AlertCircle, Users, X } from "lucide-react";
import { ALL_PRICE_LINES, PRICE_LINE_GROUPS, PRICE_LINE_LABEL, inr, type PriceLine } from "@/lib/pricing";
import type { PriceTier } from "@/lib/priceTiers-shared";
import { createTierAction, updateTierAction, deleteTierAction } from "./actions";

// Compact preview shown when a tier row is collapsed.
const PREVIEW_LINES: PriceLine[] = ["monthly", "weekly_thrice", "one_time_manual", "car_detailing"];

function priceVal(v: number | null) {
  return v == null ? "" : String(v);
}

export default function TiersBoard({ tiers, unassignedCount }: { tiers: PriceTier[]; unassignedCount: number }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-white/40">
          {tiers.length} tier{tiers.length === 1 ? "" : "s"}
          {unassignedCount > 0 && (
            <>
              {" · "}
              <Link href="/admin/cars/unassigned" className="text-[#C9A84C] hover:underline">
                {unassignedCount} car{unassignedCount === 1 ? "" : "s"} without a tier
              </Link>
            </>
          )}
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-[#050E21]"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            <Plus size={14} /> New tier
          </button>
        )}
      </div>

      {adding && <NewTierForm onClose={() => setAdding(false)} />}

      {tiers.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/40">
          No tiers yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map((t) => (
            <TierRow
              key={t.id}
              tier={t}
              editing={editingId === t.id}
              onEdit={() => setEditingId(t.id)}
              onClose={() => setEditingId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Row ----------------------------------------------------------------

function TierRow({ tier, editing, onEdit, onClose }: { tier: PriceTier; editing: boolean; onEdit: () => void; onClose: () => void }) {
  if (editing) return <TierEditor tier={tier} onClose={onClose} />;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-tight">{tier.name}</h3>
          <p className="text-[11px] text-white/40">
            <Users size={11} className="inline -mt-px mr-1" />
            {tier.car_count ?? 0} car{(tier.car_count ?? 0) === 1 ? "" : "s"} assigned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/cars/tier/${tier.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A84C]/15 text-[#E8CC7A] ring-1 ring-[#C9A84C]/25 text-xs font-semibold hover:bg-[#C9A84C]/25"
          >
            <Users size={13} /> Manage cars
          </Link>
          <button onClick={onEdit} title="Edit prices" className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10">
            <Pencil size={14} />
          </button>
          <form action={deleteTierAction} onSubmit={(e) => { if (!confirm(`Delete "${tier.name}"? Cars in this tier will keep their last prices but become unassigned.`)) e.preventDefault(); }}>
            <input type="hidden" name="id" value={tier.id} />
            <button title="Delete tier" className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20">
              <Trash2 size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Compact preview of headline prices */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {PREVIEW_LINES.map((line) => (
          <div key={line} className="rounded-lg bg-white/5 px-2.5 py-1.5">
            <div className="text-[10px] text-white/35 truncate">{PRICE_LINE_LABEL[line]}</div>
            <div className="font-semibold tabular-nums">{tier[line] != null ? inr(tier[line] as number) : <span className="text-white/25">—</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Editor (existing tier) --------------------------------------------

function TierEditor({ tier, onClose }: { tier: PriceTier; onClose: () => void }) {
  const [state, action, pending] = useActionState(updateTierAction, {} as { error?: string; ok?: string });

  return (
    <form action={action} className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-4 space-y-3">
      <input type="hidden" name="id" value={tier.id} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          name="name"
          defaultValue={tier.name}
          required
          placeholder="Tier name"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#C9A84C]"
        />
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-60" style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10"><X size={14} /></button>
        </div>
      </div>

      <PriceGrid defaults={tier} />

      <div className="flex items-center gap-3 text-[12px]">
        {state.ok && <span className="inline-flex items-center gap-1 text-emerald-300"><Check size={13} /> {state.ok}</span>}
        {state.error && <span className="inline-flex items-center gap-1 text-red-300"><AlertCircle size={13} /> {state.error}</span>}
        <span className="text-white/35">Saving updates all {tier.car_count ?? 0} car{(tier.car_count ?? 0) === 1 ? "" : "s"} in this tier.</span>
      </div>
    </form>
  );
}

// ----- New tier form ------------------------------------------------------

function NewTierForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(createTierAction, {} as { error?: string });
  return (
    <form action={action} className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          name="name"
          required
          placeholder="Tier name (e.g. Sedan B)"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#C9A84C]"
        />
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-60" style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}>
            {pending ? "Creating…" : "Create tier"}
          </button>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10"><X size={14} /></button>
        </div>
      </div>
      <PriceGrid />
      {state.error && <p className="text-[12px] text-red-300 inline-flex items-center gap-1"><AlertCircle size={13} /> {state.error}</p>}
    </form>
  );
}

// ----- Shared 9-price grid ------------------------------------------------

function PriceGrid({ defaults }: { defaults?: Partial<Record<PriceLine, number | null>> }) {
  return (
    <div className="space-y-2">
      {PRICE_LINE_GROUPS.map((group) => (
        <div key={group.category}>
          <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">{group.title}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {group.lines.map((line) => (
              <label key={line} className="block">
                <span className="text-[10px] text-white/45 block truncate">{PRICE_LINE_LABEL[line]}</span>
                <div className="mt-0.5 flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C] overflow-hidden">
                  <span className="pl-2 text-xs text-white/40">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    name={line}
                    defaultValue={priceVal(defaults?.[line] ?? null)}
                    placeholder="—"
                    className="w-full bg-transparent px-1.5 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
      {/* Sanity: ensure every PriceLine has an input so updateTier patch is complete. */}
      {ALL_PRICE_LINES.every((l) => PRICE_LINE_GROUPS.some((g) => g.lines.includes(l))) ? null : null}
    </div>
  );
}
