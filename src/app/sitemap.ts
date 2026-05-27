import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { listJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  let jobUrls: MetadataRoute.Sitemap = [];
  try {
    const jobs = await listJobs({ activeOnly: true });
    jobUrls = jobs.map((j) => ({
      url: `${siteUrl}/careers/${j.slug}`,
      lastModified: j.updated_at ? new Date(j.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    jobUrls = [];
  }

  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/booking`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/careers`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...jobUrls,
  ];
}
