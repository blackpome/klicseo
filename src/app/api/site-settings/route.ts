import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";

// Public read of the current site settings, used by SiteSettingsProvider to
// poll for changes (e.g. an admin shrinks the radius mid-session). Everything
// in SiteSettings is already rendered into public pages, so nothing sensitive
// leaks here — but we still cap the response with no-store to avoid CDN caching.
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "no-store" },
  });
}
