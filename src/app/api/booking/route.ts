import { NextRequest, NextResponse } from "next/server";
import { insertLead } from "@/lib/leads";
import { isServiceOptionId, type ServiceOptionId, type ParkingLocation } from "@/lib/pricing";
import { carPriceFor, type CarPrices } from "@/lib/carPricing";
import { getServiceDiscounts } from "@/lib/discounts";
import { getSiteSettings } from "@/lib/site-settings";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const phone = String(body.phone ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!phone || phone.length < 8) {
    return NextResponse.json({ success: false, error: "Phone number required" }, { status: 400 });
  }

  // Price comes from the per-car snapshot captured in the wizard. If the car
  // wasn't matched in the catalog (or has no price for this service), priced
  // is null → we save price_total null and the team confirms by call.
  const serviceOption = String(body.serviceOption ?? "");
  const carPrices = (body.carPrices ?? null) as CarPrices | null;
  const discounts = await getServiceDiscounts();
  const priced =
    carPrices && isServiceOptionId(serviceOption)
      ? carPriceFor(
          carPrices,
          serviceOption as ServiceOptionId,
          ((body.parkingLocation as ParkingLocation) || "") as ParkingLocation,
          Boolean(body.interiorAddOn),
          discounts,
        )
      : null;

  // Custom fields (admin-defined per step). Validate required, store {label: value}.
  const booking = (await getSiteSettings()).booking;
  const customAnswers = (body.customFields ?? {}) as Record<string, unknown>;
  const custom_fields: Record<string, string> = {};
  for (const stepKey of Object.keys(booking)) {
    for (const f of booking[stepKey as keyof typeof booking].fields) {
      if (!f.enabled) continue;
      const raw = customAnswers[f.id];
      if (f.type === "checkbox") {
        if (f.required && raw !== true) {
          return NextResponse.json({ success: false, error: `Please confirm "${f.label}".` }, { status: 400 });
        }
        if (raw === true) custom_fields[f.label] = "Yes";
      } else {
        const val = String(raw ?? "").trim();
        if (f.required && !val) {
          return NextResponse.json({ success: false, error: `Please fill "${f.label}".` }, { status: 400 });
        }
        if (val) custom_fields[f.label] = val;
      }
    }
  }

  try {
    const lead = await insertLead({
      source: "wizard",
      name: name || null,
      phone,
      service: (body.service as string | null) ?? null,
      service_option: String(body.serviceOption ?? "") || null,
      interior_add_on: Boolean(body.interiorAddOn),
      vehicle_type: String(body.vehicleType ?? "") || null,
      car_brand: String(body.carBrand ?? "") || null,
      car_model: String(body.carModel ?? "") || null,
      car_number: String(body.carNumber ?? "") || null,
      pincode: String(body.pincode ?? "") || null,
      address: String(body.address ?? "") || null,
      map_link: null,
      parking_location: String(body.parkingLocation ?? "") || null,
      car_cover_choice: String(body.carCoverChoice ?? "") || null,
      gate_access_consent: Boolean(body.gateAccessConsent),
      gate_access_notes: null,
      shift: String(body.shift ?? "") || null,
      callback_date: String(body.date ?? "") || null,
      callback_time: String(body.time ?? "") || null,
      latitude: typeof body.latitude === "number" ? body.latitude : null,
      longitude: typeof body.longitude === "number" ? body.longitude : null,
      price_total: priced?.discountedTotal ?? null,
      discount_percent: priced?.basePercent ?? null,
      custom_fields: Object.keys(custom_fields).length ? custom_fields : null,
      notes: null,
    });
    return NextResponse.json({ success: true, id: lead.id });
  } catch (err) {
    console.error("Booking insert failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not save booking. Please call us." },
      { status: 500 },
    );
  }
}
