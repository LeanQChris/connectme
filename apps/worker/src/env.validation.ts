/**
 * Fail fast on missing configuration. Called by ConfigModule.forRoot so the
 * worker refuses to boot with an incomplete environment.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(config.NODE_ENV || "development");
  const required = ["ENCRYPTION_KEY"];
  if (nodeEnv === "production") {
    required.push("DATABASE_URL", "REDIS_URL");
  }

  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) for NODE_ENV=${nodeEnv}: ${missing.join(", ")}.`,
    );
  }

  return config;
}
