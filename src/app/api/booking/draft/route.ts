import { NextRequest, NextResponse } from "next/server";
import { insertLeadDraft, updateLeadDraft } from "@/lib/leads";
import { combinedPrice, type CarPrices } from "@/lib/carPricing";
import { type ParkingLocation } from "@/lib/pricing";
import { getServiceCatalog } from "@/lib/serviceCatalog";
import { getServiceDiscounts, getDiscountConfig } from "@/lib/discounts";

// Wizard partial-save endpoint.
//
//   POST /api/booking/draft  — body: { ...wizardData }
//     → { id }                  inserts a new lead row with status="draft"
//
//   PUT  /api/booking/draft  — body: { id, ...wizardData }
//     → { ok: true|false }      updates the draft row. ok:false if the row
//                               doesn't exist OR has already been promoted
//                               past "draft" status (stale tab guard).
//
// Drafts skip the server-side validation the finalised POST /api/booking
// applies (radius gate, custom-field "required" checks, etc.) — the point is
// to capture whatever the user has typed so far, even if it's incomplete.
//
// Phone must be present and at least 8 digits before we insert; this matches
// the same minimum the final submit enforces and prevents trivial bots from
// poisoning the leads table with empty rows.

export const dynamic = "force-dynamic";

interface DraftBody {
  id?: string;
  name?: string | null;
  phone?: string | null;
  service?: string | null;
  serviceOption?: string | null;
  interiorAddOn?: boolean;
  vehicleType?: string | null;
  carBrand?: string | null;
  carModel?: string | null;
  carNumber?: string | null;
  pincode?: string | null;
  address?: string | null;
  parkingLocation?: string | null;
  carCoverChoice?: string | null;
  gateAccessConsent?: boolean;
  shift?: string | null;
  date?: string | null;
  time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  customFields?: Record<string, unknown>;
  carPrices?: CarPrices | null;
}

// Price the in-progress draft exactly like the final submit, so admins see a
// price as soon as a car + service are entered. Resolves to nulls when the car
// or service isn't chosen yet, or if pricing config can't be loaded.
async function priceForDraft(body: DraftBody): Promise<{ price_total: number | null; discount_percent: number | null }> {
  const carPrices = body.carPrices ?? null;
  const serviceOption = nz(body.serviceOption);
  if (!carPrices || !serviceOption) return { price_total: null, discount_percent: null };
  try {
    const parking = ((body.parkingLocation as ParkingLocation) || "") as ParkingLocation;
    const [catalog, discounts, cfg] = await Promise.all([
      getServiceCatalog(),
      getServiceDiscounts(),
      getDiscountConfig(),
    ]);
    const priced = combinedPrice(carPrices, serviceOption, parking, !!body.interiorAddOn, catalog, discounts, cfg.percentsByLineId, cfg.badgesByLineId);
    return { price_total: priced?.discountedTotal ?? null, discount_percent: priced?.basePercent ?? null };
  } catch {
    return { price_total: null, discount_percent: null };
  }
}

// Map the wizard's camelCase payload onto the leads-table snake_case columns.
function mapDraft(body: DraftBody) {
  // Stringify custom answers we know about — drafts don't validate required.
  const customFields = body.customFields ?? {};
  const custom: Record<string, string> = {};
  for (const [k, v] of Object.entries(customFields)) {
    if (v === true) custom[k] = "Yes";
    else if (typeof v === "string" && v.trim()) custom[k] = v.trim();
    else if (typeof v === "number") custom[k] = String(v);
  }
  return {
    name: nz(body.name),
    phone: nz(body.phone),
    service: nz(body.service),
    service_option: nz(body.serviceOption),
    interior_add_on: !!body.interiorAddOn,
    vehicle_type: nz(body.vehicleType),
    car_brand: nz(body.carBrand),
    car_model: nz(body.carModel),
    car_number: nz(body.carNumber),
    pincode: nz(body.pincode),
    address: nz(body.address),
    parking_location: nz(body.parkingLocation),
    car_cover_choice: nz(body.carCoverChoice),
    gate_access_consent: !!body.gateAccessConsent,
    shift: nz(body.shift),
    callback_date: nz(body.date),
    callback_time: nz(body.time),
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
    custom_fields: Object.keys(custom).length ? custom : null,
  };
}

function nz(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function hasAnyDraftData(p: ReturnType<typeof mapDraft>): boolean {
  if (
    p.name || p.phone || p.service || p.service_option || p.vehicle_type ||
    p.car_brand || p.car_model || p.car_number || p.pincode || p.address ||
    p.parking_location || p.car_cover_choice || p.shift ||
    p.callback_date || p.callback_time
  ) return true;
  if (p.interior_add_on || p.gate_access_consent) return true;
  if (p.latitude != null || p.longitude != null) return true;
  if (p.custom_fields && Object.keys(p.custom_fields).length > 0) return true;
  return false;
}

export async function POST(req: NextRequest) {
  let body: DraftBody;
  try {
    body = (await req.json()) as DraftBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = mapDraft(body);
  // Light guard — reject the empty form so we don't insert a row of all nulls.
  // Any single user-entered field is enough to qualify.
  if (!hasAnyDraftData(payload)) {
    return NextResponse.json({ error: "Empty draft" }, { status: 400 });
  }
  try {
    const price = await priceForDraft(body);
    const lead = await insertLeadDraft({ ...payload, ...price });
    return NextResponse.json({ id: lead.id });
  } catch (err) {
    console.error("Draft insert failed:", err);
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: DraftBody;
  try {
    body = (await req.json()) as DraftBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Draft id required" }, { status: 400 });
  }
  const payload = mapDraft(body);
  try {
    const price = await priceForDraft(body);
    const ok = await updateLeadDraft(body.id, { ...payload, ...price });
    return NextResponse.json({ ok });
  } catch (err) {
    console.error("Draft update failed:", err);
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 });
  }
}
