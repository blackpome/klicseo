import { NextRequest, NextResponse } from "next/server";
import { searchCars } from "@/lib/cars";

// GET /api/cars/search?q=swift → up to 8 matching cars (brand/model + prices).
// Used by the booking wizard's car type-ahead. Returns [] for empty queries.
export async function GET(req: NextRequest) {
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
