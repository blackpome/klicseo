"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import WhatsAppLink from "@/components/WhatsAppLink";
import { assignEmployeesAction } from "./employees/actions";
import type { EmployeeRow } from "@/lib/employees-shared";

export default function EmployeeBulkTable({
  employees,
  adminUsers,
  canManageEmployees,
}: {
  employees: EmployeeRow[];
  adminUsers: Array<{ id: string; email: string; name: string }>;
  canManageEmployees: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [adminUserId, setAdminUserId] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStartId, setRangeStartId] = useState<string | null>(null);
  const [rangeStartIndex, setRangeStartIndex] = useState<number | null>(null);
  const pointerTimersRef = { current: new Map<string, NodeJS.Timeout>() };

  const allSelected = useMemo(() => employees.length > 0 && selected.size === employees.length, [employees.length, selected.size]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(employees.map((e) => e.id)));
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

  function toggleEmployee(id: string, index: number, event: ChangeEvent<HTMLInputElement>) {
    const isShiftClick = (event.nativeEvent as MouseEvent).shiftKey;

    // If in range mode, complete the range
    if (rangeMode && rangeStartIndex !== null && id !== rangeStartId) {
      const start = Math.min(rangeStartIndex, index);
      const end = Math.max(rangeStartIndex, index);
      setSelected((current) => {
        const next = new Set(current);
        for (let i = start; i <= end; i++) {
          next.add(employees[i].id);
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
          next.add(employees[i].id);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setLastSelectedIndex(index);
  }

  function assignSelected() {
    if (!adminUserId) {
      setMessage({ kind: "error", text: "Choose a team member first." });
      return;
    }
    if (selected.size === 0) {
      setMessage({ kind: "error", text: "Select at least one employee." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("adminUserId", adminUserId);
      Array.from(selected).forEach((id) => formData.append("employeeIds", id));
      const result = await assignEmployeesAction(formData);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: `Assigned ${selected.size} employee${selected.size === 1 ? "" : "s"}.` });
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {canManageEmployees && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <span className="text-xs text-white/45">{selected.size} selected</span>
          <span className="text-xs text-white/35">Shift+click for range • Long-press on mobile</span>
          {rangeMode && <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Range mode active — tap to complete</span>}
          <select
            value={adminUserId}
            onChange={(e) => setAdminUserId(e.target.value)}
            className="min-w-56 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#C9A84C]"
          >
            <option value="">- Select team member -</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={assignSelected}
            disabled={pending || selected.size === 0 || adminUsers.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C9A84C] text-[#050E21] hover:bg-[#B0903C] disabled:opacity-50"
          >
            {pending ? "Assigning..." : "Assign selected to team member"}
          </button>
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
              {canManageEmployees && (
                <th className="px-3 py-2 text-left font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-[#C9A84C]"
                    aria-label="Select all employees"
                  />
                </th>
              )}
              <th className="text-left px-3 py-2 font-semibold">#</th>
              <th className="text-left px-3 py-2 font-semibold">Submitted (IST)</th>
              <th className="text-left px-3 py-2 font-semibold">Name</th>
              <th className="text-left px-3 py-2 font-semibold">Phone</th>
              <th className="text-left px-3 py-2 font-semibold">Role</th>
              <th className="text-left px-3 py-2 font-semibold">Assigned</th>
              <th className="text-left px-3 py-2 font-semibold">Location</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e, i) => (
              <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                {canManageEmployees && (
                  <td className={`px-3 py-2 ${
                    rangeMode && rangeStartId === e.id
                      ? "bg-amber-500/10 border border-amber-500/30 rounded"
                      : ""
                  }`}>
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={(evt) => toggleEmployee(e.id, i, evt)}
                      onPointerDown={() => handlePointerDown(e.id, i)}
                      onPointerUp={() => handlePointerUp(e.id)}
                      onPointerLeave={() => handlePointerUp(e.id)}
                      className="h-4 w-4 accent-[#C9A84C]"
                      aria-label={`Select ${e.name ?? "employee"}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-white/40 text-xs tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  <div className="text-white/80 font-medium">
                    {new Date(e.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    })}
                  </div>
                  <div className="text-white/50">
                    {new Date(e.created_at).toLocaleString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    <span className="text-white/30">IST</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-semibold">
                  <Link href={`/admin/employees/${e.id}`} className="hover:text-[#C9A84C] hover:underline">
                    {e.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <a href={`tel:${e.phone}`} className="text-[#C9A84C] hover:underline">{e.phone}</a>
                    <WhatsAppLink phone={e.phone} label={`WhatsApp ${e.name ?? e.phone ?? ""}`.trim()} />
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{e.job_role}</td>
                <td className="px-3 py-2 text-xs">{e.assigned_admin_user?.name || e.assigned_admin_user?.email || "—"}</td>
                <td className="px-3 py-2 text-xs text-white/70">{e.location ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
