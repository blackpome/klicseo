import { redirect, notFound } from "next/navigation";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import Link from "next/link";
import { listLeadLists } from "@/lib/leadLists";
import type { LeadListRow } from "@/lib/leadLists-shared";
import { currentAdmin } from "@/lib/admin-auth";
import { Plus, Pencil } from "lucide-react";
import DeleteLeadListButton from "./DeleteLeadListButton";

export default async function LeadListsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.view")) {
    return redirect("/admin/login");
  }

  // Only super_admin can access the lead lists management page.
  if (me.role !== "super_admin") notFound();

  const { q } = await searchParams;

  let lists: LeadListRow[] = [];
  try {
    lists = await listLeadLists({
      search: q,
    });
  } catch (err) {
    return (
      <AdminShell require="leads.view">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            Lead Lists
          </h1>
          <AdminError err={err} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell require="leads.view">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            Lead Lists
          </h1>
          <p className="text-white/45 text-sm">{lists.length} lists</p>
        </div>
        <Link
          href="/admin/lists/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A84C] text-[#050E21] hover:bg-[#B0903C]"
        >
          <Plus size={16} /> Create New List
        </Link>
      </div>

      {/* Search */}
      <form className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search lists by name..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
        />
        <button className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">Search</button>
      </form>

      {lists.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">
          No lead lists found.{" "}
          <Link href="/admin/lists/new" className="text-[#C9A84C] hover:underline">
            Create your first list
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Created By</th>
                <th className="px-3 py-2 text-left font-semibold">Leads</th>
                <th className="px-3 py-2 text-left font-semibold">Assigned To</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list, index) => (
                <tr key={list.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-white/40 text-xs tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/lists/${list.id}`} className="hover:text-[#C9A84C] hover:underline">
                      {list.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {list.admin_users?.email || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {list.lead_count}
                  </td>
                  <td className="px-3 py-2">
                    {list.assigned_admin_user?.name || "— Unassigned —"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/lists/${list.id}/edit`}
                        title="Edit list"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                      >
                        <Pencil size={15} />
                      </Link>
                      <DeleteLeadListButton id={list.id} name={list.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
