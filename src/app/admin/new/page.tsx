import AdminShell from "../AdminShell";
import NewLeadForm from "./NewLeadForm";

export default function NewLeadPage() {
  return (
    <AdminShell require="leads.manage">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Add Lead
        </h1>
        <p className="text-white/45 text-sm mb-6">Manually record a phone-in or walk-up enquiry.</p>
        <NewLeadForm />
      </div>
    </AdminShell>
  );
}
