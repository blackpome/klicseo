"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import {
  ListPlus,
  Phone,
  MessageSquare,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Clock,
  Car,
  Check,
  AlertCircle,
  X,
  FileSpreadsheet,
  Globe,
  User,
} from "lucide-react";
import LeadStatusControl from "./LeadStatusControl";
import WhatsAppLink from "@/components/WhatsAppLink";
import ColumnVisibilityPicker from "@/components/ColumnVisibilityPicker";
import { useColumnPreferences, type ColumnDefinition } from "@/lib/useColumnPreferences";
import { formatPhone } from "@/lib/phone-shared";
import { addLeadsToListAction } from "./lists/actions";
import { getLeadSourceInfo, type LeadStatus } from "@/lib/leads-shared";
import type { CustomLeadStatus } from "@/lib/site-settings-shared";
import type { LeadListRow } from "@/lib/leadLists-shared";

export type LeadForTable = {
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
  pincode: string | null;
  area?: string | null;
  address?: string | null;
  callback_date: string | null;
  callback_time: string | null;
  shift: string | null;
  map_link: string | null;
  latitude: number | null;
  longitude: number | null;
  price_total: number | null;
  source: string;
  notes?: string | null;
  custom_fields?: Record<string, string> | null;
  status: LeadStatus;
};

const MASTER_LEAD_COLUMNS: ColumnDefinition[] = [
  { key: "customer", label: "Customer & Vehicle", required: true },
  { key: "contact", label: "Contact & Actions", defaultVisible: true },
  { key: "location", label: "Location / Locality", defaultVisible: true },
  { key: "service", label: "Service & Price", defaultVisible: true },
  { key: "lists", label: "List / Tags", defaultVisible: true },
  { key: "status", label: "Lead Status", defaultVisible: true },
  { key: "date", label: "Date / Time", defaultVisible: false },
  { key: "notes", label: "Internal Notes", defaultVisible: false },
];

export default function LeadBulkListTable({
  leads,
  lists,
  statusColor,
  canManageLists,
  leadListNames,
  customStatuses,
}: {
  leads: LeadForTable[];
  lists: LeadListRow[];
  statusColor: Record<string, string>;
  canManageLists: boolean;
  leadListNames: Map<string, string[]>;
  customStatuses?: CustomLeadStatus[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetListId, setTargetListId] = useState<string>("");
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const colPrefs = useColumnPreferences(
    "klicseo_master_leads_columns_v1",
    MASTER_LEAD_COLUMNS,
  );

  const allSelected = useMemo(
    () => leads.length > 0 && selected.size === leads.length,
    [leads.length, selected.size],
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleLead = (id: string, index: number, e: ChangeEvent<HTMLInputElement>) => {
    const nativeEvent = e.nativeEvent as MouseEvent;
    const isShift = nativeEvent.shiftKey;

    setSelected((prev) => {
      const next = new Set(prev);
      const willBeChecked = !next.has(id);

      if (isShift && lastCheckedIndex !== null) {
        const start = Math.min(lastCheckedIndex, index);
        const end = Math.max(lastCheckedIndex, index);
        for (let i = start; i <= end; i++) {
          const targetId = leads[i]?.id;
          if (targetId) {
            if (willBeChecked) next.add(targetId);
            else next.delete(targetId);
          }
        }
      } else {
        if (willBeChecked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

    setLastCheckedIndex(index);
  };

  const handleAddToList = () => {
    if (!targetListId || selected.size === 0) return;
    const leadIds = Array.from(selected);

    startTransition(async () => {
      const fd = new FormData();
      fd.append("listId", targetListId);
      for (const id of leadIds) {
        fd.append("leadIds", id);
      }

      const res = await addLeadsToListAction(fd);

      if (!res?.error) {
        setMessage({
          kind: "ok",
          text: `Added ${leadIds.length} lead${leadIds.length === 1 ? "" : "s"} to list.`,
        });
        setSelected(new Set());
        setTargetListId("");
      } else {
        setMessage({ kind: "err", text: res.error || "Failed to add leads to list." });
      }
    });
  };

  return (
    <div className="space-y-3 relative">
      {/* Toast Feedback */}
      {message && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border ${
            message.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.kind === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-white/40 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Toolbar with Table Controls & Column Visibility Picker */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="text-xs text-white/50">
          Showing <span className="text-white font-semibold tabular-nums">{leads.length}</span> leads
        </div>
        <ColumnVisibilityPicker
          columns={colPrefs.columns}
          isVisible={colPrefs.isVisible}
          toggleColumn={colPrefs.toggleColumn}
          showAll={colPrefs.showAll}
          resetToDefault={colPrefs.resetToDefault}
          visibleCount={colPrefs.visibleCount}
          totalCount={colPrefs.totalCount}
        />
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#071228] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">
                {canManageLists && (
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#C9A84C] accent-[#C9A84C] cursor-pointer"
                      aria-label="Select all leads"
                    />
                  </th>
                )}
                <th className="px-3 py-3.5 w-12">#</th>
                <th className="px-4 py-3.5">Customer & Vehicle</th>
                {colPrefs.isVisible("contact") && <th className="px-4 py-3.5">Contact & Actions</th>}
                {colPrefs.isVisible("location") && <th className="px-4 py-3.5">Location / Locality</th>}
                {colPrefs.isVisible("service") && <th className="px-4 py-3.5">Service & Price</th>}
                {colPrefs.isVisible("lists") && <th className="px-4 py-3.5">List / Tags</th>}
                {colPrefs.isVisible("date") && <th className="px-4 py-3.5">Date</th>}
                {colPrefs.isVisible("notes") && <th className="px-4 py-3.5">Notes</th>}
                {colPrefs.isVisible("status") && <th className="px-4 py-3.5 text-right">Status</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {leads.map((lead, i) => {
                const isSelected = selected.has(lead.id);
                const vehicleSummary =
                  [lead.car_brand, lead.car_model].filter(Boolean).join(" ") ||
                  lead.vehicle_type ||
                  "";
                const dateStr = new Date(lead.submitted_at ?? lead.created_at).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    timeZone: "Asia/Kolkata",
                  },
                );

                const sourceInfo = getLeadSourceInfo(lead);

                return (
                  <tr
                    key={lead.id}
                    className={`group transition-colors ${
                      isSelected
                        ? "bg-[#C9A84C]/10"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Checkbox */}
                    {canManageLists && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleLead(lead.id, i, e)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#C9A84C] accent-[#C9A84C] cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Row Index */}
                    <td className="px-3 py-3 text-white/30 text-[11px] font-mono tabular-nums">
                      {i + 1}
                    </td>

                    {/* Customer & Vehicle */}
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/${lead.id}`}
                          className="font-semibold text-white group-hover:text-[#E8CC7A] transition-colors text-sm"
                        >
                          {lead.name || "(Unnamed Lead)"}
                        </Link>

                        {lead.status === "draft" && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/50 uppercase">
                            Draft
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/50">
                        {vehicleSummary ? (
                          <span className="flex items-center gap-1 text-white/70">
                            <Car size={11} className="text-[#C9A84C]" />
                            {vehicleSummary}
                          </span>
                        ) : (
                          <span>No vehicle</span>
                        )}

                        {lead.car_number && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-[#E8CC7A] uppercase border border-white/10">
                            {lead.car_number}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact & Inline Actions */}
                    {colPrefs.isVisible("contact") && (
                      <td className="px-4 py-3 min-w-[170px]">
                        {lead.phone ? (
                          <div className="space-y-1">
                            <div className="font-mono text-xs text-white/90 flex items-center gap-1.5 font-semibold">
                              <span>{formatPhone(lead.phone)}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-0.5">
                              <a
                                href={`tel:${lead.phone}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#C9A84C]/20 text-[#E8CC7A] text-[10px] font-medium transition-colors border border-white/5"
                                title="Call customer"
                              >
                                <Phone size={10} /> Call
                              </a>

                              <WhatsAppLink
                                phone={lead.phone}
                                label="Chat"
                              />

                              {lead.map_link && (
                                <a
                                  href={lead.map_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-sky-500/20 text-sky-400 text-[10px] transition-colors border border-white/5"
                                  title="Open Google Maps Location"
                                >
                                  <MapPin size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                    )}

                    {/* Locality & Location */}
                    {colPrefs.isVisible("location") && (
                      <td className="px-4 py-3 min-w-[150px]">
                        {lead.area ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] font-medium">
                            <MapPin size={10} /> {lead.area}
                          </div>
                        ) : lead.pincode ? (
                          <span className="font-mono text-xs text-white/60">PIN {lead.pincode}</span>
                        ) : (
                          <span className="text-white/30 text-[11px]">Chennai</span>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-1 flex-wrap">
                          <span>{dateStr}</span>
                          <span>•</span>

                          {/* Interactive Source Tooltip Badge */}
                          <div className="relative group/tip inline-flex items-center">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] font-semibold cursor-help transition-all hover:brightness-125 ${sourceInfo.badgeBg} ${sourceInfo.textColor}`}
                            >
                              {sourceInfo.iconType === "upload" && <FileSpreadsheet size={10} />}
                              {sourceInfo.iconType === "globe" && <Globe size={10} />}
                              {sourceInfo.iconType === "user" && <User size={10} />}
                              <span>{sourceInfo.shortLabel}</span>
                            </span>

                            {/* Floating Astryx Tooltip Box */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center z-50 whitespace-nowrap drop-shadow-2xl">
                              <div className="bg-[#050E21] border border-white/20 text-white text-[11px] px-3 py-2 rounded-xl shadow-2xl space-y-0.5 text-left min-w-[190px]">
                                <div className="font-bold text-[#E8CC7A] flex items-center gap-1.5">
                                  {sourceInfo.iconType === "upload" && <FileSpreadsheet size={12} />}
                                  {sourceInfo.iconType === "globe" && <Globe size={12} />}
                                  {sourceInfo.iconType === "user" && <User size={12} />}
                                  <span>{sourceInfo.label}</span>
                                </div>
                                <div className="text-[10px] text-white/70">
                                  {sourceInfo.description}
                                </div>
                              </div>
                              <div className="w-2 h-2 -mt-1 rotate-45 bg-[#050E21] border-r border-b border-white/20" />
                            </div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Service & Price */}
                    {colPrefs.isVisible("service") && (
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="font-medium text-white/90 text-xs">
                          {lead.service || <span className="text-white/30">Unspecified Service</span>}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40">
                          {lead.service_option && <span>{lead.service_option}</span>}
                          {lead.price_total != null && (
                            <span className="font-semibold text-[#E8CC7A]">
                              ₹{lead.price_total.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Lead List Tags */}
                    {colPrefs.isVisible("lists") && (
                      <td className="px-4 py-3 min-w-[130px]">
                        {leadListNames.has(lead.id) ? (
                          <div className="flex flex-wrap gap-1">
                            {leadListNames.get(lead.id)!.map((name) => (
                              <span
                                key={name}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#C9A84C]/15 text-[#E8CC7A] border border-[#C9A84C]/25 whitespace-nowrap"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-white/20 text-[10px]">—</span>
                        )}
                      </td>
                    )}

                    {/* Submitted Date (Optional column) */}
                    {colPrefs.isVisible("date") && (
                      <td className="px-4 py-3 text-white/50 text-[11px] tabular-nums whitespace-nowrap">
                        {dateStr}
                      </td>
                    )}

                    {/* Notes (Optional column) */}
                    {colPrefs.isVisible("notes") && (
                      <td className="px-4 py-3 max-w-[180px] text-white/70 text-xs truncate" title={lead.notes || ""}>
                        {lead.notes || <span className="text-white/20">—</span>}
                      </td>
                    )}

                    {/* Status Dropdown */}
                    {colPrefs.isVisible("status") && (
                      <td className="px-4 py-3 text-right">
                        <LeadStatusControl
                          id={lead.id}
                          status={lead.status}
                          color={statusColor[lead.status] || "#C9A84C"}
                          customStatuses={customStatuses}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bottom Dock for Bulk Actions */}
      {selected.size > 0 && canManageLists && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[#071228]/95 backdrop-blur-md border border-[#C9A84C]/40 rounded-2xl px-5 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs text-white font-medium pr-2 border-r border-white/10">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#C9A84C] text-[#050E21] font-bold text-[10px]">
              {selected.size}
            </span>
            <span>selected</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="bg-[#050E21] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
            >
              <option value="">— Assign to List —</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!targetListId || isPending}
              onClick={handleAddToList}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md shadow-[#C9A84C]/20"
            >
              <ListPlus size={13} />
              <span>{isPending ? "Assigning…" : "Add to List"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title="Deselect all"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
