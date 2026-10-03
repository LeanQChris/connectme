/**
 * Fail fast on missing configuration. Called by ConfigModule.forRoot so the API
 * refuses to boot with an incomplete environment instead of failing later on
 * the first request.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(config.NODE_ENV || "development");

  const required = ["ENCRYPTION_KEY"];
  if (nodeEnv === "production") {
    required.push("CLERK_SECRET_KEY", "DATABASE_URL", "REDIS_URL");
    if (!config.CORS_ORIGINS && !config.NEXT_PUBLIC_APP_URL) {
      throw new Error(
        "Production requires CORS_ORIGINS or NEXT_PUBLIC_APP_URL so CORS is not left open.",
      );
    }
  }

  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) for NODE_ENV=${nodeEnv}: ${missing.join(", ")}.`,
    );
  }

  return config;
}
