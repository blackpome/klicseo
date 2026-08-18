"use client";

import { useState, useTransition } from "react";
import {
  X,
  RotateCcw,
  ArrowRight,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { transferStaffLeadsAction } from "./routing-actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adminUsers: { id: string; email: string; name: string }[];
  onTransferred: () => void;
}

export default function StaffReallocationModal({
  isOpen,
  onClose,
  adminUsers,
  onTransferred,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [fromAdminUserId, setFromAdminUserId] = useState("");
  const [toAdminUserId, setToAdminUserId] = useState("");
  const [reason, setReason] = useState("Leave coverage / Workload rebalancing");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAdminUserId || !toAdminUserId) {
      setError("Please select both source and destination team members.");
      return;
    }
    if (fromAdminUserId === toAdminUserId) {
      setError("Cannot transfer leads to the same team member.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await transferStaffLeadsAction(fromAdminUserId, toAdminUserId, reason);
      if (res.ok) {
        onTransferred();
        onClose();
      } else {
        setError(res.error || "Failed to transfer leads.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#071228] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">1-Click Staff Reallocation</h2>
              <p className="text-xs text-white/40">
                Instantly transfer campaign lists and lead queues between staff members.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* From */}
            <div className="space-y-1">
              <label className="text-white/60 font-semibold">From (Current Assignee)</label>
              <select
                value={fromAdminUserId}
                onChange={(e) => setFromAdminUserId(e.target.value)}
                className="w-full bg-[#050E21] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C9A84C]"
              >
                <option value="">— Select Staff —</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* To */}
            <div className="space-y-1">
              <label className="text-white/60 font-semibold">To (New Assignee)</label>
              <select
                value={toAdminUserId}
                onChange={(e) => setToAdminUserId(e.target.value)}
                className="w-full bg-[#050E21] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C9A84C]"
              >
                <option value="">— Select Staff —</option>
                {adminUsers
                  .filter((u) => u.id !== fromAdminUserId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-white/60 font-semibold">Reallocation Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Leave coverage, high load rebalancing"
              className="w-full bg-[#050E21] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending || !fromAdminUserId || !toAdminUserId}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all shadow-md shadow-[#C9A84C]/20 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Transferring…</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  <span>Execute Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
