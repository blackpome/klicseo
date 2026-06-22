import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminShell from "../../AdminShell";
import AdminError from "../../AdminError";
import LeadForm from "../../LeadForm";
import { updateLeadAction } from "../../actions";
import { getLead, assertLeadInScope } from "@/lib/leads";
import { listKnownAreas } from "@/lib/area";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await currentAdmin();

  let lead;
  try {
    lead = await getLead(id);
  } catch (err) {
    return (
      <AdminShell require="leads.manage">
        <AdminError err={err} />
      </AdminShell>
    );
  }
  if (!lead) notFound();

  // Scope guard: non-super-admins may only edit leads in their assigned lists.
  if (me) {
    const scope = (await resolveScope(me)) ?? { kind: "all" as const };
    if (!(await assertLeadInScope(id, scope))) notFound();
  }
  const knownAreas = await listKnownAreas();

  // useActionState passes (prevState, formData) — bind the id so the action
  // knows which row to patch without needing a hidden input on the client.
  async function action(prev: { error?: string }, formData: FormData) {
    "use server";
    formData.set("id", id);
    return updateLeadAction(prev, formData);
  }

  return (
    <AdminShell require="leads.manage">
      <div className="max-w-5xl">
        <Link href={`/admin/${id}`} className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white mb-4">
          <ArrowLeft size={13} /> Back to lead
        </Link>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Edit Lead
        </h1>
        <p className="text-white/45 text-sm mb-6">Update lead details. Status and internal notes are edited on the detail page.</p>
        <LeadForm action={action} initial={lead} submitLabel="Save changes" pendingLabel="Saving…" knownAreas={knownAreas} />
      </div>
    </AdminShell>
  );
}
