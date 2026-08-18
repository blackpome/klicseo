import AdminShell from "../AdminShell";
import NewLeadForm from "./NewLeadForm";
import { listKnownAreas } from "@/lib/area";
import { listLeadLists } from "@/lib/leadLists";
import { currentAdmin } from "@/lib/admin-auth";
import { getAdminUser } from "@/lib/admin-users";

export default async function NewLeadPage() {
  const [knownAreas, me] = await Promise.all([
    listKnownAreas(),
    currentAdmin(),
  ]);

  const adminRow = me?.email ? await getAdminUser(me.email) : null;
  const isSuperAdmin = me?.role === "super_admin";

  const leadLists = await listLeadLists(
    isSuperAdmin ? {} : { assignedAdminUserId: adminRow?.id },
  ).catch(() => []);

  return (
    <AdminShell require="leads.manage">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Add Lead
        </h1>
        <p className="text-white/45 text-sm mb-6">Manually record a phone-in or walk-up enquiry.</p>
        <NewLeadForm knownAreas={knownAreas} leadLists={leadLists} />
      </div>
    </AdminShell>
  );
}
