import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // TODO: connect to DB / send email / trigger SMS here
  console.log("Booking received:", body);

  return NextResponse.json({ success: true, message: "Booking received" });
}
