import { NextRequest, NextResponse } from "next/server";
import { insertLead, promoteLeadDraft } from "@/lib/leads";
import { type ParkingLocation } from "@/lib/pricing";
import { combinedPrice, type CarPriceResult, type CarPrices } from "@/lib/carPricing";
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
  const addOnSelections = (typeof body.addOnSelections === "object" && body.addOnSelections !== null)
    ? (body.addOnSelections as Record<string, boolean>)
    : {};

  let priced: CarPriceResult | null = null;
  let addOnLabels: string[] | null = null;
  if (carPrices && serviceOption) {
    const [catalog, cfg] = await Promise.all([getServiceCatalog(), getDiscountConfig()]);
    priced = combinedPrice(carPrices, serviceOption, parking, addOnSelections, catalog, discounts, cfg.percentsByLineId, cfg.badgesByLineId);
    const selected = catalog.options.filter((o) => addOnSelections[o.id] && o.is_addon).map((o) => o.label);
    if (selected.length) addOnLabels = selected;
  } else if (Object.keys(addOnSelections).length) {
    // No car price snapshot but user did pick add-ons — resolve labels from catalog for the record.
    const catalog = await getServiceCatalog().catch(() => null);
    if (catalog) {
      const selected = catalog.options.filter((o) => addOnSelections[o.id] && o.is_addon).map((o) => o.label);
      if (selected.length) addOnLabels = selected;
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
    interior_add_on: Object.values(addOnSelections).some(Boolean),
    add_on_labels: addOnLabels,
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
    client_timezone: String(body.clientTimezone ?? "") || null,
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
    price_total: priced?.discountedTotal ?? null,
    price_base: priced?.discountedBase ?? null,
    price_interior_addon: priced ? (priced.discountedTotal - priced.discountedBase) || null : null,
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
    let leadId: string;
    if (draftId) {
      const promoted = await promoteLeadDraft(draftId, payload);
      if (promoted) {
        return NextResponse.json({ success: true, id: promoted.id });
      }
      // draft is gone / already promoted — quietly insert a new lead.
    }
    const lead = await insertLead(payload);
    leadId = lead.id;

    return NextResponse.json({ success: true, id: leadId });
  } catch (err) {
    console.error("Booking insert failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not save booking. Please call us." },
      { status: 500 },
    );
  }
}
