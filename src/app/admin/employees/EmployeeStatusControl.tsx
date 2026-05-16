"use client";

import { useTransition } from "react";
import type { EmployeeStatus } from "@/lib/employees-shared";
import { setEmployeeStatusAction } from "./actions";

const STATUSES: EmployeeStatus[] = [
  "applied",
  "screening",
  "hired",
  "active",
  "resigned",
  "rejected",
];

export default function EmployeeStatusControl({
  id,
  status,
  color,
}: {
  id: string;
  status: EmployeeStatus;
  color: string;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as EmployeeStatus;
        const fd = new FormData();
        fd.append("id", id);
        fd.append("status", next);
        start(() => setEmployeeStatusAction(fd));
      }}
      className="text-xs font-semibold rounded-md px-2 py-1 bg-transparent border focus:outline-none cursor-pointer"
      style={{ borderColor: `${color}80`, color }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[#050E21]">{s}</option>
      ))}
    </select>
  );
}
