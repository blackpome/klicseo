import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { getAdminUser } from "@/lib/admin-users";
import { listLeadLists } from "@/lib/leadLists";
import type { LeadListRow } from "@/lib/leadLists-shared";

export default async function MyListsPage() {
  const me = await currentAdmin();
  const user = me ? await getAdminUser(me.email) : null;

  if (!user) {
    return (
      <AdminShell require="leads.view">
        <div className="max-w-xl rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#C9A84C]/15 text-[#C9A84C]">
            <ClipboardList size={22} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            No admin account
          </h1>
          <p className="text-sm text-white/45">You must be signed in with an admin account to see your lists.</p>
        </div>
      </AdminShell>
    );
  }

  let lists: LeadListRow[] = [];
  try {
    lists = await listLeadLists({ assignedAdminUserId: user.id });
  } catch (err) {
    return (
      <AdminShell require="leads.view">
        <AdminError err={err} />
      </AdminShell>
    );
  }

  return (
    <AdminShell require="leads.view">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            My Lists
          </h1>
          <p className="text-white/45 text-sm">
            {lists.length} assigned to {user.employees?.name ?? "you"}
          </p>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">No lead lists are assigned to you yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Leads</th>
                <th className="px-3 py-2 text-left font-semibold">Created By</th>
                <th className="px-3 py-2 text-center font-semibold">Open</th>
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
                  <td className="px-3 py-2">{list.lead_count ?? 0}</td>
                  <td className="px-3 py-2">{list.admin_users?.email || "-"}</td>
                  <td className="px-3 py-2 text-center">
                    <Link
                      href={`/admin/lists/${list.id}`}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/10 text-white/70 hover:text-white hover:bg-white/15"
                    >
                      Open <ArrowRight size={12} />
                    </Link>
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
