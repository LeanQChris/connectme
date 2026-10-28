import type { NextConfig } from "next";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

function publicOrigin(value: string | undefined): string {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.origin : "";
  } catch { return ""; }
}

const apiOrigin = publicOrigin(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081");
const socketOrigin = apiOrigin.replace(/^http/, "ws");
const mediaOrigins = (process.env.NEXT_PUBLIC_MEDIA_ORIGINS || "").split(",").map(publicOrigin).filter(Boolean).join(" ");
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const clerkHost = Buffer.from(publishableKey.replace(/^pk_(test|live)_/, ""), "base64").toString().replace(/\$$/, "");
const clerkOrigin = /^[a-z0-9.-]+$/i.test(clerkHost) ? `https://${clerkHost}` : "";
const clerk = `https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com ${clerkOrigin}`;
const evalPolicy = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${evalPolicy} ${clerk} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${clerk} ${apiOrigin} ${socketOrigin} ${mediaOrigins}`,
  `frame-src 'self' ${clerkOrigin} https://challenges.cloudflare.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
