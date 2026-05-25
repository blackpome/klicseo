import { notFound } from "next/navigation";
import Link from "next/link";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import LeadStatusControl from "../LeadStatusControl";
import LeadNotesEditor from "./LeadNotesEditor";
import DeleteLeadButton from "./DeleteLeadButton";
import WhatsAppLink from "@/components/WhatsAppLink";
import { getLead } from "@/lib/leads";
import { LEAD_STATUS_COLOR } from "@/lib/leads-shared";
import { getCustomerPayments } from "@/lib/payments";
import { inr } from "@/lib/pricing";
import { ArrowLeft, Phone, MapPin, User, Car, Calendar, Sunrise, Sunset, Sparkles, Pencil, Wallet } from "lucide-react";

const STATUS_COLOR = LEAD_STATUS_COLOR;

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
      <AdminShell require="leads.view">
        <AdminError err={err} />
      </AdminShell>
    );
  }
  if (!lead) notFound();

  const paymentHistory = await getCustomerPayments(id).catch(() => []);

  const ShiftIcon = lead.shift === "morning" ? Sunrise : Sunset;
  const shiftLabel =
    lead.shift === "morning"
      ? "Morning Shift (4 AM – 10 AM)"
      : lead.shift === "evening"
      ? "Evening Shift (8 PM – 11 PM)"
      : "—";

  return (
    <AdminShell require="leads.view">
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
            <span className="inline-flex items-center gap-2">
              <a href={`tel:${lead.phone}`} className="text-[#C9A84C] hover:underline inline-flex items-center gap-1">
                <Phone size={12} /> {lead.phone}
              </a>
              <WhatsAppLink phone={lead.phone} label={`WhatsApp ${lead.name ?? lead.phone}`} />
            </span>
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
                <span className="inline-flex items-center gap-2">
                  <a href={`tel:${lead.phone}`} className="text-[#C9A84C] hover:underline">{lead.phone}</a>
                  <WhatsAppLink phone={lead.phone} label={`WhatsApp ${lead.name ?? lead.phone}`} />
                </span>
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
          <Field label="Area" value={fmt(lead.area)} />
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

        {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
          <Section title="Additional details" icon={Sparkles}>
            {Object.entries(lead.custom_fields).map(([label, value]) => (
              <Field key={label} label={label} value={fmt(value)} />
            ))}
          </Section>
        )}

        <Section title="Payments" icon={Wallet}>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-white/40 py-1">
              No payments recorded.{" "}
              <Link href="/admin/payments" className="text-[#C9A84C] hover:underline">Open payment tracker →</Link>
            </p>
          ) : (
            <div className="space-y-1.5 py-1">
              {paymentHistory.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm border-b border-white/5 pb-1.5 last:border-0">
                  <span className="text-white/70">{p.period}</span>
                  <span className="text-white/50 text-xs">
                    {p.amount != null ? inr(p.amount) : "—"}
                    {p.method ? ` · ${p.method.toUpperCase()}` : ""}
                    {p.paid_at ? ` · ${p.paid_at}` : ""}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {p.status}
                  </span>
                </div>
              ))}
              <Link href="/admin/payments" className="inline-block text-[#C9A84C] text-xs hover:underline mt-1">Open payment tracker →</Link>
            </div>
          )}
        </Section>

        <Section title="Internal notes" icon={User}>
          <LeadNotesEditor id={lead.id} initialNotes={lead.notes ?? ""} />
        </Section>
      </div>
    </AdminShell>
  );
}
