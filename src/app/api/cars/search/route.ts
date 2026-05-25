import { NextRequest, NextResponse } from "next/server";
import { searchCars, getCar, listAllCars } from "@/lib/cars";

// GET /api/cars/search
//   ?q=swift   → up to `limit` fuzzy-matched cars (brand/model + prices).
//                 Used by the booking wizard's car type-ahead.
//   ?id=<uuid> → exactly one car by id, with current tier prices. Used to
//                 refresh a localStorage-cached draft so price/MRP changes
//                 propagate to returning users without a manual re-pick.
//   ?all=1     → every car in the catalog (capped, ordered by brand/model).
//                 Used by the admin tier picker so cars already in other
//                 tiers can be moved without scrolling through fuzzy results.
//   (none)     → []
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const id = params.get("id");
  if (id) {
    try {
      const car = await getCar(id);
      return NextResponse.json({ cars: car ? [car] : [] });
    } catch (err) {
      console.error("Car lookup failed:", err);
      return NextResponse.json({ cars: [], error: "Lookup failed" }, { status: 500 });
    }
  }
  if (params.get("all") === "1") {
    try {
      const cars = await listAllCars(500);
      return NextResponse.json({ cars });
    } catch (err) {
      console.error("Car list failed:", err);
      return NextResponse.json({ cars: [], error: "List failed" }, { status: 500 });
    }
  }
  const q = params.get("q") ?? "";
  if (q.trim().length < 1) {
    return NextResponse.json({ cars: [] });
  }
  const limitRaw = Number(params.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.round(limitRaw)) : 8;
  try {
    const cars = await searchCars(q, limit);
    return NextResponse.json({ cars });
  } catch (err) {
    console.error("Car search failed:", err);
    return NextResponse.json({ cars: [], error: "Search failed" }, { status: 500 });
  }
}
