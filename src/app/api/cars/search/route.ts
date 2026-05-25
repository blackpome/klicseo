import { NextRequest, NextResponse } from "next/server";
import { searchCars, getCar } from "@/lib/cars";

// GET /api/cars/search
//   ?q=swift   → up to 8 fuzzy-matched cars (brand/model + prices). Used by
//                 the booking wizard's car type-ahead.
//   ?id=<uuid> → exactly one car by id, with current tier prices. Used to
//                 refresh a localStorage-cached draft so price/MRP changes
//                 propagate to returning users without a manual re-pick.
//   (neither)  → []
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    try {
      const car = await getCar(id);
      return NextResponse.json({ cars: car ? [car] : [] });
    } catch (err) {
      console.error("Car lookup failed:", err);
      return NextResponse.json({ cars: [], error: "Lookup failed" }, { status: 500 });
    }
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 1) {
    return NextResponse.json({ cars: [] });
  }
  try {
    const cars = await searchCars(q);
    return NextResponse.json({ cars });
  } catch (err) {
    console.error("Car search failed:", err);
    return NextResponse.json({ cars: [], error: "Search failed" }, { status: 500 });
  }
}
