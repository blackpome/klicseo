import { siteUrl } from "@/lib/seo";

type Crumb = { name: string; path: string };

// Emits Google-compatible BreadcrumbList JSON-LD. `path` is relative to siteUrl
// (e.g. "/", "/booking", "/careers/field-marketing-lead"). The first crumb
// should always be Home.
export default function BreadcrumbsJsonLd({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.path}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
