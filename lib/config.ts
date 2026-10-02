/**
 * Single typed entry point for every environment variable.
 *
 * Values are resolved lazily through getters so that a missing variable throws
 * at request time with a clear message, instead of crashing `next build` when
 * it merely imports this module.
 *
 * Nothing here is prefixed with NEXT_PUBLIC_, so none of it can leak into the
 * client bundle.
 */

function read(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

function readOptional(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim();
}

export const config = {
  /**
   * Default Graph API version, e.g. "v21.0". Tenants may override it in
   * their own settings; this is only the fallback.
   */
  get graphVersion(): string {
    return readOptional("GRAPH_VERSION") ?? "v21.0";
  },

  /**
   * Master key protecting every tenant's provider tokens (AES-256-GCM).
   * Rotating it invalidates all stored credentials.
   */
  get encryptionKey(): string {
    const key = read("ENCRYPTION_KEY");
    if (key.length < 16) {
      throw new Error("ENCRYPTION_KEY must be at least 16 characters long.");
    }
    return key;
  },

  /**
   * Vercel KV / Upstash REST endpoint. When both are set the store keeps its
   * data there instead of in a local JSON file. Absent locally, so local dev
   * keeps working without any setup.
   */
  get kvRestApiUrl(): string | undefined {
    return readOptional("KV_REST_API_URL")?.replace(/\/$/, "");
  },

  /** Bearer token paired with KV_REST_API_URL. */
  get kvRestApiToken(): string | undefined {
    return readOptional("KV_REST_API_TOKEN");
  },

  /** Central Meta Platform App ID for 1-click OAuth & Embedded Signup. */
  get metaAppId(): string | undefined {
    return (
      readOptional("META_APP_ID") ??
      readOptional("NEXT_PUBLIC_META_APP_ID") ??
      readOptional("APP_ID") ??
      readOptional("NEXT_PUBLIC_APP_ID")
    );
  },

  /** Central Meta Platform App Secret used to exchange tokens & verify webhooks. */
  get metaAppSecret(): string | undefined {
    return readOptional("META_APP_SECRET") ?? readOptional("APP_SECRET");
  },

  /** Central webhook verify token configured in the Meta App Developer Dashboard. */
  get metaWebhookVerifyToken(): string | undefined {
    return (
      readOptional("META_WEBHOOK_VERIFY_TOKEN") ??
      readOptional("WEBHOOK_VERIFY_TOKEN") ??
      readOptional("VERIFY_TOKEN")
    );
  },

  /** Public application base URL (e.g. http://localhost:3000 or https://connectme.app). */
  get appUrl(): string {
    return (
      readOptional("NEXT_PUBLIC_APP_URL") ??
      readOptional("APP_URL") ??
      "http://localhost:3000"
    ).replace(/\/$/, "");
  },
} as const;

/** Meta Graph API base URL for a given version and path. */
export function graphUrl(version: string, path: string): string {
  return `https://graph.facebook.com/${version}/${path}`;
}