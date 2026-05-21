import { notFound } from "next/navigation";
import Link from "next/link";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import LeadStatusControl from "../LeadStatusControl";
import LeadNotesEditor from "./LeadNotesEditor";
import DeleteLeadButton from "./DeleteLeadButton";
import { getLead, type LeadStatus } from "@/lib/leads";
import { ArrowLeft, Phone, MapPin, User, Car, Calendar, Sunrise, Sunset, Sparkles, Pencil } from "lucide-react";

const STATUS_COLOR: Record<LeadStatus, string> = {
  new: "#3B82F6",
  contacted: "#C9A84C",
  booked: "#10b981",
  cancelled: "#EF4444",
};

function fmt(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="border-b border-white/5 py-2.5">
      <div className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="flex items-center gap-2 text-[11px] font-bold text-[#C9A84C] uppercase tracking-widest mb-2">
        <Icon size={12} /> {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let lead;
  try {
    lead = await getLead(id);
  } catch (err) {
    return (
      <AdminShell>
        <AdminError err={err} />
      </AdminShell>
    );
  }
  if (!lead) notFound();

  const ShiftIcon = lead.shift === "morning" ? Sunrise : Sunset;
  const shiftLabel =
    lead.shift === "morning"
      ? "Morning Shift (4 AM – 10 AM)"
      : lead.shift === "evening"
      ? "Evening Shift (8 PM – 11 PM)"
      : "—";

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft size={13} /> All leads
        </Link>
        <div className="flex items-center gap-3">
          <LeadStatusControl id={lead.id} status={lead.status} color={STATUS_COLOR[lead.status]} />
          <Link
            href={`/admin/${lead.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/15 text-white/80 hover:text-white hover:border-white/30"
          >
            <Pencil size={12} /> Edit
          </Link>
          <DeleteLeadButton id={lead.id} />
        </div>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
          {lead.name ?? "Unnamed lead"}
        </h1>
        <p className="text-white/50 text-sm mt-1 flex items-center gap-3 flex-wrap">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="text-[#C9A84C] hover:underline inline-flex items-center gap-1">
              <Phone size={12} /> {lead.phone}
            </a>
          )}
          <span className="text-white/30">·</span>
          <span>
            {new Date(lead.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <span className="text-white/30">·</span>
          <span className="uppercase tracking-wider text-[10px] font-bold text-white/40">
            from {lead.source}
          </span>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Contact" icon={User}>
          <Field label="Name" value={fmt(lead.name)} />
          <Field
            label="Phone"
            value={
              lead.phone ? (
                <a href={`tel:${lead.phone}`} className="text-[#C9A84C] hover:underline">{lead.phone}</a>
              ) : "—"
            }
          />
        </Section>

        <Section title="Service" icon={Sparkles}>
          <Field label="Category" value={fmt(lead.service)} />
          <Field label="Option" value={fmt(lead.service_option)} />
          <Field label="Interior add-on" value={fmt(lead.interior_add_on)} />
          <Field
            label="Price (snapshot)"
            value={lead.price_total != null ? `₹${lead.price_total.toLocaleString("en-IN")}` : "—"}
          />
        </Section>

        <Section title="Vehicle" icon={Car}>
          <Field label="Type" value={fmt(lead.vehicle_type)} />
          <Field label="Brand" value={fmt(lead.car_brand)} />
          <Field label="Model" value={fmt(lead.car_model)} />
          <Field label="Number plate" value={fmt(lead.car_number)} mono />
        </Section>

        <Section title="Location" icon={MapPin}>
          <Field label="Pincode" value={fmt(lead.pincode)} mono />
          <Field
            label="Address"
            value={lead.address ? <span className="whitespace-pre-line">{lead.address}</span> : "—"}
          />
          <Field label="Parking" value={fmt(lead.parking_location)} />
          <Field label="Car cover" value={fmt(lead.car_cover_choice)} />
          <Field
            label="Gate access notes"
            value={
              lead.gate_access_notes ? (
                <span className="whitespace-pre-line">{lead.gate_access_notes}</span>
              ) : lead.gate_access_consent ? (
                "Confirmed (legacy flag)"
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Map"
            value={
              lead.map_link ? (
                <a
                  href={lead.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3B82F6] hover:underline break-all"
                >
                  {lead.map_link} ↗
                </a>
              ) : lead.latitude != null && lead.longitude != null ? (
                <a
                  href={`https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3B82F6] hover:underline inline-flex items-center gap-1"
                >
                  Open on Google Maps ↗
                  <span className="text-white/40 text-[11px] font-mono ml-1">
                    ({lead.latitude.toFixed(5)}, {lead.longitude.toFixed(5)})
                  </span>
                </a>
              ) : (
                "—"
              )
            }
          />
        </Section>

        <Section title="Scheduling" icon={Calendar}>
          <Field
            label="Service shift"
            value={
              lead.shift ? (
                <span className="inline-flex items-center gap-2">
                  <ShiftIcon size={14} className="text-[#C9A84C]" />
                  {shiftLabel}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Field label="Callback date" value={fmt(lead.callback_date)} />
          <Field label="Callback time" value={fmt(lead.callback_time)} />
        </Section>

        <Section title="Internal notes" icon={User}>
          <LeadNotesEditor id={lead.id} initialNotes={lead.notes ?? ""} />
        </Section>
      </div>
    </AdminShell>
  );
}
