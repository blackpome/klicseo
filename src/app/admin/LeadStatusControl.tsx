"use client";

import { useTransition } from "react";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads-shared";
import { setStatusAction } from "./actions";

export default function LeadStatusControl({
  id,
  status,
  color,
}: {
  id: string;
  status: LeadStatus;
  color: string;
}) {
  const [pending, start] = useTransition();
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
      style={{ borderColor: `${color}80`, color }}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[#050E21]">
          {LEAD_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
