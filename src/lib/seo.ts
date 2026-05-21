const fallbackSiteUrl = "https://klicseo.com";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || fallbackSiteUrl;

export const businessName = "Klicseo";
export const businessPhone = "+91 79043 32212";
export const businessEmail = "klicseo@gmail.com";

export const primaryCity = "Chennai";
export const serviceAreas = [
  "Ullagaram",
  "Puzhuthivakkam",
  "Nanganallur",
  "Adambakkam",
  "Maduvinkarai",
] as const;

export const serviceAreaText = serviceAreas.join(", ");

export const seoKeywords = [
  "klicseo",
  "klicseo car wash",
  "klicseo doorstep car wash",
  "doorstep car wash chennai",
  "doorstep car care chennai",
  "car wash chennai",
  "car detailing chennai",
  "one time car wash chennai",
  "ceramic coating chennai",
  "ceramic sealant coating chennai",
  "interior detailing chennai",
  "subscription car wash chennai",
  "weekly car wash chennai",
  "monthly car wash chennai",
  "doorstep car cleaning ullagaram",
  "car wash ullagaram",
  "car wash puzhuthivakkam",
  "car wash nanganallur",
  "car wash adambakkam",
  "car wash maduvinkarai",
  "car detailing ullagaram",
  "car detailing puzhuthivakkam",
  "car detailing nanganallur",
  "car detailing adambakkam",
  "one time wash ullagaram",
  "one time wash puzhuthivakkam",
  "one time wash nanganallur",
  "one time wash adambakkam",
  "one time wash maduvinkarai",
  "outside car wash chennai",
  "doorstep washing service chennai",
] as const;

export const homeDescription =
  "Klicseo is a doorstep car wash, car detailing, and one-time wash service in Chennai, serving Ullagaram, Puzhuthivakkam, Nanganallur, Adambakkam, and Maduvinkarai.";

export const bookingDescription =
  "Book Klicseo doorstep car wash, car detailing, or one-time wash in Chennai. Choose your vehicle, package, and callback time online.";
