"use client";

import { useTransition } from "react";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads-shared";
import type { CustomLeadStatus } from "@/lib/site-settings-shared";
import { setStatusAction } from "./actions";

export default function LeadStatusControl({
  id,
  status,
  color,
  customStatuses,
}: {
  id: string;
  status: LeadStatus;
  color?: string;
  customStatuses?: CustomLeadStatus[];
}) {
  const [pending, start] = useTransition();

  const activeColor =
    color ||
    customStatuses?.find((s) => s.id === status)?.color ||
    "#C9A84C";

  const options =
    customStatuses && customStatuses.length > 0
      ? customStatuses
      : LEAD_STATUSES.map((s) => ({
          id: s,
          label: LEAD_STATUS_LABEL[s] || s,
          color: activeColor,
        }));

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        const fd = new FormData();
        fd.append("id", id);
        fd.append("status", next);
        start(() => setStatusAction(fd));
      }}
      className="text-xs font-semibold rounded-md px-2 py-1 bg-transparent border focus:outline-none cursor-pointer"
      style={{ borderColor: `${activeColor}80`, color: activeColor }}
    >
      {options.map((s) => (
        <option key={s.id} value={s.id} className="bg-[#050E21] text-white">
          {s.label}
        </option>
      ))}
    </select>
  );
}
