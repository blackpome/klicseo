import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Explicit per-bot rules so AI assistants (ChatGPT, Claude, Perplexity, Google
// AI Overviews, Apple Intelligence) can crawl and cite Klicseo. Without an
// explicit allow, some of these bots default to "skip" on unknown sites.
const aiBots = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "Amazonbot",
  "CCBot",
  "Meta-ExternalAgent",
  "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/", disallow: ["/admin", "/api"] })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
