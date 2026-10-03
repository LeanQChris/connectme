/**
 * Core environment configuration for the web frontend.
 */

export const envConfig = {
  apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
  socketUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081",
} as const;
