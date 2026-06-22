"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { ListPlus } from "lucide-react";
import LeadStatusControl from "./LeadStatusControl";
import WhatsAppLink from "@/components/WhatsAppLink";
import { addLeadsToListAction } from "./lists/actions";
import type { LeadStatus } from "@/lib/leads-shared";
import type { LeadListRow } from "@/lib/leadLists-shared";

type LeadForTable = {
  id: string;
  created_at: string;
  submitted_at?: string | null;
  client_timezone?: string | null;
  name: string | null;
  phone: string | null;
  service: string | null;
  service_option: string | null;
  add_on_labels: string[] | null;
  vehicle_type: string | null;
  car_brand: string | null;
  car_model: string | null;
  car_number: string | null;
  callback_date: string | null;
  callback_time: string | null;
  shift: string | null;
  map_link: string | null;
  latitude: number | null;
  longitude: number | null;
  price_total: number | null;
  source: string;
  status: LeadStatus;
};

function isIST(tz: string | null | undefined): boolean {
  if (!tz) return true;
  try {
    const now = new Date();
    const fmt = (zone: string) =>
      new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    return fmt(tz) === fmt("Asia/Kolkata");
  } catch {
    return false;
  }
}

export default function LeadBulkListTable({
  leads,
  lists,
  statusColor,
  canManageLists,
  leadListNames,
}: {
  leads: LeadForTable[];
  lists: LeadListRow[];
  statusColor: Record<LeadStatus, string>;
  canManageLists: boolean;
  /** Map from lead_id → list of list names. Shown as pills in the List column. */
  leadListNames: Map<string, string[]>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [listId, setListId] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStartId, setRangeStartId] = useState<string | null>(null);
  const [rangeStartIndex, setRangeStartIndex] = useState<number | null>(null);
  const pointerTimersRef = { current: new Map<string, NodeJS.Timeout>() };

  const allSelected = useMemo(() => leads.length > 0 && selected.size === leads.length, [leads.length, selected.size]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((lead) => lead.id)));
  }

  function handlePointerDown(id: string, index: number) {
    const timer = setTimeout(() => {
      // Long-press detected (500ms)
      setRangeMode(true);
      setRangeStartId(id);
      setRangeStartIndex(index);
      setSelected((current) => new Set(current).add(id));
    }, 500);
    pointerTimersRef.current.set(id, timer);
  }

  function handlePointerUp(id: string) {
    const timer = pointerTimersRef.current.get(id);
    if (timer) clearTimeout(timer);
    pointerTimersRef.current.delete(id);
  }

  function toggleLead(id: string, index: number, event: ChangeEvent<HTMLInputElement>) {
    const isShiftClick = (event.nativeEvent as MouseEvent).shiftKey;

    // If in range mode, complete the range
    if (rangeMode && rangeStartIndex !== null && id !== rangeStartId) {
      const start = Math.min(rangeStartIndex, index);
      const end = Math.max(rangeStartIndex, index);
      setSelected((current) => {
        const next = new Set(current);
        for (let i = start; i <= end; i++) {
          next.add(leads[i].id);
        }
        return next;
      });
      setRangeMode(false);
      setRangeStartId(null);
      setRangeStartIndex(null);
      setLastSelectedIndex(index);
      return;
    }

    setSelected((current) => {
      const next = new Set(current);
      if (isShiftClick && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          next.add(leads[i].id);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setLastSelectedIndex(index);
  }

  function addSelected() {
    if (!listId) {
      setMessage({ kind: "error", text: "Choose a lead list first." });
      return;
    }
    if (selected.size === 0) {
      setMessage({ kind: "error", text: "Select at least one lead." });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("listId", listId);
      Array.from(selected).forEach((id) => formData.append("leadIds", id));
      const result = await addLeadsToListAction(formData);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      const list = lists.find((item) => item.id === listId);
      setMessage({ kind: "ok", text: `Added ${selected.size} lead${selected.size === 1 ? "" : "s"} to ${list?.name ?? "list"}.` });
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {canManageLists && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <span className="text-xs text-white/45">{selected.size} selected</span>
          <span className="text-xs text-white/35">Shift+click for range • Long-press on mobile</span>
          {rangeMode && <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Range mode active — tap to complete</span>}
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="min-w-56 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#C9A84C]"
          >
            <option value="">- Select list -</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addSelected}
            disabled={pending || selected.size === 0 || lists.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C9A84C] text-[#050E21] hover:bg-[#B0903C] disabled:opacity-50"
          >
            <ListPlus size={14} /> {pending ? "Adding..." : "Add selected to list"}
          </button>
          <Link href="/admin/lists/new" className="text-xs text-[#C9A84C] hover:underline">
            Create list
          </Link>
          {message && (
            <span className={`text-[11px] ${message.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>
              {message.text}
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
            <tr>
              {canManageLists && (
                <th className="px-3 py-2 text-left font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-[#C9A84C]"
                    aria-label="Select all leads"
                  />
                </th>
              )}
              <th className="text-left px-3 py-2 font-semibold">#</th>
              <th className="text-left px-3 py-2 font-semibold">Submitted / Started (IST)</th>
              <th className="text-left px-3 py-2 font-semibold">Name</th>
              <th className="text-left px-3 py-2 font-semibold">Phone</th>
              <th className="text-left px-3 py-2 font-semibold">Service</th>
              <th className="text-left px-3 py-2 font-semibold">Vehicle</th>
              <th className="text-left px-3 py-2 font-semibold">Callback</th>
              <th className="text-left px-3 py-2 font-semibold">Shift</th>
              <th className="text-left px-3 py-2 font-semibold">GPS</th>
              <th className="text-right px-3 py-2 font-semibold">Price</th>
              <th className="text-left px-3 py-2 font-semibold">Source</th>
              <th className="text-left px-3 py-2 font-semibold">List</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <tr key={lead.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                {canManageLists && (
                  <td className={`px-3 py-2 ${
                    rangeMode && rangeStartId === lead.id
                      ? "bg-amber-500/10 border border-amber-500/30 rounded"
                      : ""
                  }`}>
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={(e) => toggleLead(lead.id, i, e)}
                      onPointerDown={() => handlePointerDown(lead.id, i)}
                      onPointerUp={() => handlePointerUp(lead.id)}
                      onPointerLeave={() => handlePointerUp(lead.id)}
                      className="h-4 w-4 accent-[#C9A84C]"
                      aria-label={`Select ${lead.name ?? "lead"}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-white/40 text-xs tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  {lead.status === "draft" ? (
                    <div className="text-white/30 text-[10px] uppercase tracking-wide">Started</div>
                  ) : (
                    <div className="text-[10px] uppercase tracking-wide text-white/30">Submitted</div>
                  )}
                  <div className="text-white/80 font-medium">
                    {new Date(lead.submitted_at ?? lead.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    })}
                  </div>
                  <div className="text-white/50">
                    {new Date(lead.submitted_at ?? lead.created_at).toLocaleString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    <span className="text-white/30">IST</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-semibold">
                  <Link href={`/admin/${lead.id}`} className="hover:text-[#C9A84C] hover:underline">
                    {lead.name ?? "(unnamed)"}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    {lead.phone ? (
                      <>
                        <a href={`tel:${lead.phone}`} className="text-[#C9A84C] hover:underline">
                          {lead.phone}
                        </a>
                        <WhatsAppLink phone={lead.phone} label={`WhatsApp ${lead.name ?? lead.phone ?? ""}`.trim()} />
                      </>
                    ) : (
                      "-"
                    )}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div>{lead.service ?? "-"}</div>
                  <div className="text-[11px] text-white/45">
                    {[lead.service_option, ...(lead.add_on_labels ?? []).map((lbl) => `+ ${lbl}`)].filter(Boolean).join(" | ")}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div>{[lead.car_brand, lead.car_model].filter(Boolean).join(" ") || lead.vehicle_type || "-"}</div>
                  <div className="text-[11px] text-white/45">{[lead.vehicle_type, lead.car_number].filter(Boolean).join(" | ")}</div>
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {lead.callback_date ? <div className="text-white/80 font-medium">{lead.callback_date}</div> : null}
                  {lead.callback_time ? (
                    <div className="text-white/50 text-[11px]">
                      {lead.callback_time}
                      {lead.client_timezone && !isIST(lead.client_timezone) && (
                        <span
                          className="ml-1 rounded px-1 py-0.5 text-[9px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30"
                          title={lead.client_timezone}
                        >
                          Non-IST
                        </span>
                      )}
                    </div>
                  ) : null}
                  {!lead.callback_date && !lead.callback_time ? <span className="text-white/30">-</span> : null}
                </td>
                <td className="px-3 py-2 text-xs">{lead.shift ?? "-"}</td>
                <td className="px-3 py-2 text-xs">
                  {lead.map_link ? (
                    <a href={lead.map_link} target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] hover:underline">
                      Map
                    </a>
                  ) : lead.latitude != null && lead.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3B82F6] hover:underline"
                    >
                      Map
                    </a>
                  ) : (
                    <span className="text-white/30">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {lead.price_total != null ? `Rs ${lead.price_total.toLocaleString("en-IN")}` : "-"}
                </td>
                <td className="px-3 py-2 text-[11px] text-white/50">{lead.source}</td>
                <td className="px-3 py-2">
                  {leadListNames.has(lead.id) ? (
                    <div className="flex flex-wrap gap-1">
                      {leadListNames.get(lead.id)!.map((name) => (
                        <span key={name} className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#C9A84C]/15 text-[#E8CC7A] border border-[#C9A84C]/25 whitespace-nowrap">
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-white/25 text-[10px]">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <LeadStatusControl id={lead.id} status={lead.status} color={statusColor[lead.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
