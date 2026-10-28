import { validateVapidConfig } from "@connectme/crypto";

const ALLOWED_NODE_ENVS = ["development", "test", "production"] as const;
const MIN_ENCRYPTION_KEY_LENGTH = 32;

/**
 * Fail fast on missing or unsafe configuration. Called by ConfigModule.forRoot
 * so the API refuses to boot with an incomplete environment instead of failing
 * later on the first request.
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

  const required = ["ENCRYPTION_KEY"];
  if (nodeEnv === "production") {
    required.push("CLERK_SECRET_KEY", "DATABASE_URL", "REDIS_URL", "NEXT_PUBLIC_APP_URL", "OAUTH_STATE_SECRET", "WIDGET_ALLOWED_ORIGINS");
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

  if (nodeEnv === "production") {
    if (String(config.OAUTH_STATE_SECRET).trim().length < 32) throw new Error("OAUTH_STATE_SECRET must be at least 32 characters in production.");
    const originKeys = ["NEXT_PUBLIC_APP_URL", "CORS_ORIGINS", "CLERK_AUTHORIZED_PARTIES"];
    for (const key of originKeys) {
      if (!config[key]) continue;
      for (const origin of String(config[key]).split(",")) {
        try {
          const url = new URL(origin.trim());
          if (url.protocol !== "https:" || url.username || url.password || url.origin !== origin.trim().replace(/\/$/, "")) throw new Error();
        } catch { throw new Error(`${key} must contain explicit HTTPS origins, without paths or wildcards.`); }
      }
    }
    const widgetOrigins = String(config.WIDGET_ALLOWED_ORIGINS).split(",").map((value) => value.trim()).filter(Boolean);
    if (!widgetOrigins.length || widgetOrigins.some((value) => {
      try {
        const url = new URL(value.includes("://") ? value : `https://${value}`);
        return url.protocol !== "https:" || Boolean(url.username || url.password || url.search || url.hash) || url.pathname !== "/" || !/^[a-z0-9.-]+(?::[0-9]+)?$/i.test(url.host);
      } catch { return true; }
    })) throw new Error("WIDGET_ALLOWED_ORIGINS requires explicit HTTPS origins or hostnames.");
  }

  validateVapidConfig(config);
  return config;
}

/**
 * Schema synchronization is dangerous in production. Keep it opt-in via an
 * explicit flag and never derive it from a loosely-checked NODE_ENV string.
 */
export function shouldSynchronize(): boolean {
  const nodeEnv = String(process.env.NODE_ENV || "development");
  if (nodeEnv === "production") return false;
  return String(process.env.DB_SYNCHRONIZE ?? "true") === "true";
}
