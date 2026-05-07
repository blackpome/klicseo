// Business location used to compute distance to a customer's GPS coordinates.
// REPLACE these coordinates with your actual address.
// Find lat/lng: open Google Maps → search your address → right-click the pin → click the lat/lng to copy.
export const BUSINESS_LOCATION = {
  name: "Klicseo HQ, Chennai",
  // Placeholder: T. Nagar, Chennai. Replace with your real coordinates.
  lat: 12.991276703215846,
  lng: 80.2082051288356,
};

// Per-service radius (km). Car-wash flows are limited to short trips because
// they're high-frequency / low-margin; detailing trips can travel further
// since they're longer engagements with higher ticket size.
export const SERVICE_RADIUS_KM_BY_CATEGORY: Record<string, number> = {
  CarWash:        2.5,
  OneTimeCarWash: 2.5,
  CarDetailing:   10,
};

// Used when no service has been chosen yet — stay generous so the user
// isn't told they're out of range before they've even picked a service.
export const DEFAULT_SERVICE_RADIUS_KM = 10;

export function radiusForService(service: string | null | undefined): number {
  if (!service) return DEFAULT_SERVICE_RADIUS_KM;
  return SERVICE_RADIUS_KM_BY_CATEGORY[service] ?? DEFAULT_SERVICE_RADIUS_KM;
}

// Phone number shown to customers whose location is outside the radius.
// Keep in sync with the footer / contact section.
export const SUPPORT_PHONE = "+917904332212";

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
