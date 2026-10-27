import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  return pages.map((page) => ({
    url: `${BASE}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}