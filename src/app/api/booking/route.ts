import { NextRequest, NextResponse } from "next/server";
import { insertLead, promoteLeadDraft } from "@/lib/leads";
import { isServiceOptionId, type ServiceOptionId, type ParkingLocation } from "@/lib/pricing";
import { carPriceFor, carPriceForCatalog, type CarPrices } from "@/lib/carPricing";
import { getServiceDiscounts, getDiscountConfig } from "@/lib/discounts";
import { getSiteSettings } from "@/lib/site-settings";
import { getServiceCatalog } from "@/lib/serviceCatalog";
import { radiusFor } from "@/lib/site-settings-shared";
import { BUSINESS_LOCATION, haversineKm } from "@/lib/serviceability";

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
  const parking = ((body.parkingLocation as ParkingLocation) || "") as ParkingLocation;
  const interiorAddOn = Boolean(body.interiorAddOn);

  // Legacy options use the keyed pricing path; admin-created options resolve
  // via the catalog. Both code paths apply the badge-on/off discount gate.
  let priced = null as ReturnType<typeof carPriceFor> | null;
  if (carPrices) {
    if (isServiceOptionId(serviceOption)) {
      priced = carPriceFor(carPrices, serviceOption as ServiceOptionId, parking, interiorAddOn, discounts);
    } else if (serviceOption) {
      const [catalog, cfg] = await Promise.all([getServiceCatalog(), getDiscountConfig()]);
      priced = carPriceForCatalog(carPrices, serviceOption, parking, interiorAddOn, catalog, cfg.percentsByLineId, cfg.badgesByLineId);
    }
  }

  const settings = await getSiteSettings();

  // Server-side serviceability gate: if GPS coords were captured at the location
  // step, verify the customer is still within the admin-configured radius for
  // their chosen service. Prevents a stale client (e.g. browser tab held open
  // while the admin shrank the radius) from sneaking a booking through.
  const lat = typeof body.latitude === "number" ? body.latitude : null;
  const lng = typeof body.longitude === "number" ? body.longitude : null;
  if (lat != null && lng != null) {
    const distanceKm = haversineKm(BUSINESS_LOCATION, { lat, lng });
    const allowedKm = radiusFor(settings.serviceRadius, (body.service as string | null) ?? null);
    if (distanceKm > allowedKm) {
      return NextResponse.json(
        { success: false, error: `Your location (${distanceKm.toFixed(1)} km away) is outside our current service area (${allowedKm} km) for this service.` },
        { status: 400 },
      );
    }
  }

  // Custom fields (admin-defined per step). Validate required, store {label: value}.
  const booking = settings.booking;
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

  // Common payload shared by the insert-new and promote-draft paths.
  const payload = {
    source: "wizard" as const,
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
    // area is auto-derived from pincode by insertLead/updateLead.
    area: null,
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
  };

  // If the client carries a draftId from the wizard's partial-save flow,
  // promote the existing draft row (status draft → new) rather than insert
  // a fresh lead. Falls back to insert if the draft has been deleted or
  // already promoted by another tab.
  const draftId = typeof body.draftId === "string" && body.draftId ? body.draftId : null;
  try {
    if (draftId) {
      const promoted = await promoteLeadDraft(draftId, payload);
      if (promoted) {
        return NextResponse.json({ success: true, id: promoted.id });
      }
      // draft is gone / already promoted — quietly insert a new lead.
    }
    const lead = await insertLead(payload);
    return NextResponse.json({ success: true, id: lead.id });
  } catch (err) {
    console.error("Booking insert failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not save booking. Please call us." },
      { status: 500 },
    );
  }
}
