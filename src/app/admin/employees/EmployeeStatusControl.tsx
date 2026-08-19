"use client";

import { useState, useTransition, useEffect } from "react";
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
  const [currentStatus, setCurrentStatus] = useState<EmployeeStatus>(status);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  return (
    <select
      value={currentStatus}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as EmployeeStatus;
        setCurrentStatus(next);
        const fd = new FormData();
        fd.append("id", id);
        fd.append("status", next);
        start(async () => {
          try {
            await setEmployeeStatusAction(fd);
          } catch (err) {
            console.error("Failed to update employee status:", err);
            setCurrentStatus(status);
          }
        });
      }}
      className={`text-xs font-semibold rounded-md px-2 py-1 bg-transparent border focus:outline-none cursor-pointer transition-opacity ${
        pending ? "opacity-60" : "opacity-100"
      }`}
      style={{ borderColor: `${color}80`, color }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[#050E21]">{s}</option>
      ))}
    </select>
  );
}
