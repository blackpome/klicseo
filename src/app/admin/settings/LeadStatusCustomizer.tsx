"use client";

import { useState, useTransition } from "react";
import {
  Tag,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  Sparkles,
  Lock,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import {
  DEFAULT_LEAD_STATUS_ITEMS,
  type CustomLeadStatus,
} from "@/lib/site-settings-shared";
import { saveLeadStatusSettingsAction } from "./actions";

const COLOR_PALETTE = [
  { name: "Gold", hex: "#C9A84C" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Orange", hex: "#F97316" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Rose", hex: "#EF4444" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Slate", hex: "#64748B" },
];

export default function LeadStatusCustomizer({
  initialStatuses = DEFAULT_LEAD_STATUS_ITEMS,
}: {
  initialStatuses?: CustomLeadStatus[];
}) {
  const [statuses, setStatuses] = useState<CustomLeadStatus[]>(
    initialStatuses && initialStatuses.length > 0
      ? initialStatuses
      : DEFAULT_LEAD_STATUS_ITEMS,
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // New status form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#C9A84C");
  const [newDescription, setNewDescription] = useState("");

  const handleUpdateStatus = (
    index: number,
    field: keyof CustomLeadStatus,
    value: any,
  ) => {
    setStatuses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveStatus = (index: number) => {
    const item = statuses[index];
    if (item?.isSystem) return; // Prevent deleting core system statuses
    setStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomStatus = () => {
    if (!newLabel.trim()) return;
    const slug = newLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!slug) return;
    if (statuses.some((s) => s.id === slug)) {
      setMessage({ kind: "err", text: "A status with this name already exists." });
      return;
    }

    const newItem: CustomLeadStatus = {
      id: slug,
      label: newLabel.trim(),
      color: newColor,
      description: newDescription.trim() || undefined,
      isSystem: false,
      enabled: true,
    };

    setStatuses((prev) => [...prev, newItem]);
    setNewLabel("");
    setNewDescription("");
    setNewColor("#C9A84C");
    setShowAddForm(false);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all lead status labels, colors, and items back to defaults?")) {
      setStatuses(DEFAULT_LEAD_STATUS_ITEMS);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveLeadStatusSettingsAction(statuses);
      if (res?.ok) {
        setMessage({ kind: "ok", text: "Lead status customizations saved successfully!" });
      } else {
        setMessage({ kind: "err", text: res?.error || "Failed to save lead statuses." });
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#071228] p-5 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#E8CC7A]">
              <Tag size={15} />
            </div>
            <h2 className="text-base font-bold text-white">Lead Status Customization</h2>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Customize lead status labels, badge colors, and workflow steps across your CRM.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="text-[11px] text-white/40 hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5"
          title="Reset to standard default statuses"
        >
          <RotateCcw size={11} /> Reset Defaults
        </button>
      </div>

      {/* Toast Alert */}
      {message && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border ${
            message.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.kind === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-white/40 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* List of Status Items */}
      <div className="space-y-3">
        {statuses.map((status, index) => (
          <div
            key={status.id}
            className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Badge Preview */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold shadow-sm whitespace-nowrap"
                  style={{
                    backgroundColor: `${status.color}22`,
                    color: status.color,
                    border: `1px solid ${status.color}44`,
                  }}
                >
                  ● {status.label || "(Empty Label)"}
                </span>

                <span className="text-[10px] font-mono text-white/30 truncate">
                  ID: {status.id}
                </span>

                {status.isSystem && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/40 flex items-center gap-0.5 shrink-0">
                    <Lock size={8} /> Core
                  </span>
                )}
              </div>

              {/* Delete button (only for custom added statuses) */}
              {!status.isSystem && (
                <button
                  type="button"
                  onClick={() => handleRemoveStatus(index)}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
                  title="Delete custom status"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Editing Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              {/* Display Label Input */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  Display Label
                </label>
                <input
                  type="text"
                  value={status.label}
                  onChange={(e) => handleUpdateStatus(index, "label", e.target.value)}
                  className="w-full bg-[#050E21] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                  placeholder="e.g. Follow Up"
                />
              </div>

              {/* Color Swatch & Palette */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  Badge Color
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c.hex}
                      onClick={() => handleUpdateStatus(index, "color", c.hex)}
                      className={`h-5 w-5 rounded-full border transition-all ${
                        status.color.toLowerCase() === c.hex.toLowerCase()
                          ? "ring-2 ring-white scale-110"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.hex, borderColor: "rgba(255,255,255,0.2)" }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={status.color}
                    onChange={(e) => handleUpdateStatus(index, "color", e.target.value)}
                    className="h-6 w-6 rounded border border-white/20 bg-transparent cursor-pointer p-0"
                    title="Custom Color Picker"
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  Description / Workflow Note
                </label>
                <input
                  type="text"
                  value={status.description ?? ""}
                  onChange={(e) => handleUpdateStatus(index, "description", e.target.value)}
                  className="w-full bg-[#050E21] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-[#C9A84C]"
                  placeholder="e.g. Callback scheduled"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Custom Status Form */}
      {showAddForm ? (
        <div className="p-4 rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#E8CC7A] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>Create New Custom Lead Status</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase text-white/50 font-bold block mb-1">
                Status Name *
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Inspection Scheduled"
                className="w-full bg-[#050E21] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-white/50 font-bold block mb-1">
                Description / Note
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Vehicle inspection booked"
                className="w-full bg-[#050E21] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-white/50 font-bold block mb-1">
                Badge Color
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c.hex}
                    onClick={() => setNewColor(c.hex)}
                    className={`h-5 w-5 rounded-full border transition-all ${
                      newColor.toLowerCase() === c.hex.toLowerCase()
                        ? "ring-2 ring-white scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex, borderColor: "rgba(255,255,255,0.2)" }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCustomStatus}
              disabled={!newLabel.trim()}
              className="px-4 py-1.5 rounded-xl bg-[#C9A84C] text-[#050E21] text-xs font-bold hover:brightness-105 disabled:opacity-50"
            >
              Add Status
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-xs font-semibold text-white/70 hover:text-white hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={14} className="text-[#C9A84C]" />
          <span>Add Custom Lead Status Option</span>
        </button>
      )}

      {/* Save Action Bar */}
      <div className="border-t border-white/[0.08] pt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#050E21] shadow-lg hover:brightness-105 transition-all disabled:opacity-50 flex items-center gap-2"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          <Check size={14} />
          <span>{isPending ? "Saving Changes..." : "Save Status Customizations"}</span>
        </button>
      </div>
    </div>
  );
}
