"use client";

import { useActionState } from "react";
import { updateAccessEmployeeAction } from "./actions";

export default function EmployeeLinkForm({
  email,
  employeeId,
  employees,
}: {
  email: string;
  employeeId: string | null;
  employees: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateAccessEmployeeAction, {});

  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="email" value={email} />
      <label className="block min-w-64 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-white/40">Employee record</span>
        <select
          name="employee_id"
          defaultValue={employeeId ?? ""}
          className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#C9A84C]"
        >
          <option value="">- Not linked -</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save link"}
      </button>
      {state.error && <span className="text-[11px] text-red-300">{state.error}</span>}
      {state.ok && <span className="text-[11px] text-emerald-300">{state.ok}</span>}
    </form>
  );
}
