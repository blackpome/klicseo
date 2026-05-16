import { NextRequest, NextResponse } from "next/server";
import { insertLead } from "@/lib/leads";
import { priceFor } from "@/lib/pricing";

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

  const priced = priceFor(
    String(body.serviceOption ?? ""),
    String(body.vehicleType ?? ""),
    Boolean(body.interiorAddOn),
    (body.parkingLocation as "" | "inside" | "outside") || "",
  );

  try {
    const lead = await insertLead({
      source: "wizard",
      name: name || null,
      phone,
      service: (body.service as string | null) ?? null,
      service_option: String(body.serviceOption ?? "") || null,
      interior_add_on: Boolean(body.interiorAddOn),
      vehicle_type: String(body.vehicleType ?? "") || null,
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
      price_total: priced?.total ?? null,
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
