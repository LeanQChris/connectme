import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // App surfaces require a session and should never be indexed.
        disallow: ["/inbox", "/dashboard", "/settings", "/scheduled", "/conversations", "/sign-in"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}