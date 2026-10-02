/**
 * Core environment configuration for the web frontend.
 */

export const envConfig = {
  apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  socketUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
} as const;
