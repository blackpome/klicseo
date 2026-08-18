import Link from "next/link";
import { ArrowRight, ClipboardList, PhoneCall, Sparkles } from "lucide-react";
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
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-[#071228] p-8 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#C9A84C]/15 text-[#C9A84C]">
            <ClipboardList size={24} />
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
            No admin account found
          </h1>
          <p className="text-xs text-white/45">You must be signed in with an admin account to access your assigned lists.</p>
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

  const staffName = user.employees?.name ?? user.email;

  return (
    <AdminShell require="leads.view">
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            My Lead Lists
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Campaign worklists assigned to <strong>{staffName}</strong> ({lists.length} lists active)
          </p>
        </div>

        {lists.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#071228] p-12 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/30">
              <ClipboardList size={24} />
            </div>
            <h3 className="text-sm font-semibold text-white">No lists assigned yet</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Your supervisor or super-admin has not assigned any lead calling lists to your account yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => {
              const count = list.lead_count ?? 0;

              return (
                <div
                  key={list.id}
                  className="group rounded-2xl border border-white/[0.08] bg-[#071228] p-5 space-y-4 hover:border-[#C9A84C]/40 hover:bg-white/[0.01] transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <Link
                      href={`/admin/lists/${list.id}`}
                      className="text-base font-bold text-white group-hover:text-[#E8CC7A] transition-colors block"
                    >
                      {list.name}
                    </Link>

                    <p className="text-[11px] text-white/40">
                      Created by {list.admin_users?.email || "Admin"}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Leads in List</span>
                      <span className="font-bold text-white text-sm tabular-nums">
                        {count} {count === 1 ? "lead" : "leads"}
                      </span>
                    </div>

                    <Link
                      href={`/admin/lists/${list.id}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#C9A84C]/15"
                    >
                      <PhoneCall size={13} /> Start Calling ({count} Leads)
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
