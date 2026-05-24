import AdminShell from "../AdminShell";
import NewLeadForm from "./NewLeadForm";
import { listKnownAreas } from "@/lib/area";

export default async function NewLeadPage() {
  const knownAreas = await listKnownAreas();
  return (
    <AdminShell require="leads.manage">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Add Lead
        </h1>
        <p className="text-white/45 text-sm mb-6">Manually record a phone-in or walk-up enquiry.</p>
        <NewLeadForm knownAreas={knownAreas} />
      </div>
    </AdminShell>
  );
}
