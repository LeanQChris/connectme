const ALLOWED_NODE_ENVS = ["development", "test", "production"] as const;
const MIN_ENCRYPTION_KEY_LENGTH = 32;

/**
 * Fail fast on missing or unsafe configuration. Called by ConfigModule.forRoot
 * so the worker refuses to boot with an incomplete environment.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(config.NODE_ENV || "development");

  if (!ALLOWED_NODE_ENVS.includes(nodeEnv as (typeof ALLOWED_NODE_ENVS)[number])) {
    throw new Error(
      `NODE_ENV must be one of ${ALLOWED_NODE_ENVS.join(", ")} (received "${nodeEnv}").`,
    );
  }

  const encryptionKey = String(config.ENCRYPTION_KEY || "");
  if (encryptionKey.length < MIN_ENCRYPTION_KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be at least ${MIN_ENCRYPTION_KEY_LENGTH} characters. Generate one with \`openssl rand -hex 32\`.`,
    );
  }

  const required = ["ENCRYPTION_KEY", "DATABASE_URL", "REDIS_URL"];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) for NODE_ENV=${nodeEnv}: ${missing.join(", ")}.`,
    );
  }

  return config;
}
