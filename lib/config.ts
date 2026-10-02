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
  /** Meta app secret. Used to verify X-Hub-Signature-256 on webhooks. */
  get appSecret(): string {
    return read("APP_SECRET");
  },

  /** The token we invented and gave to Meta when subscribing the webhook. */
  get webhookVerifyToken(): string {
    return read("WEBHOOK_VERIFY_TOKEN");
  },

  /** Graph API version, e.g. "v21.0". */
  get graphVersion(): string {
    return readOptional("GRAPH_VERSION") ?? "v21.0";
  },

  /** WhatsApp Business phone number id that sends the messages. */
  get waPhoneNumberId(): string {
    return read("WA_PHONE_NUMBER_ID");
  },

  /** WhatsApp Cloud API system user access token. */
  get waAccessToken(): string {
    return read("WA_ACCESS_TOKEN");
  },

  /** Facebook Page access token. Absent until a Page is connected. */
  get fbPageAccessToken(): string | undefined {
    return readOptional("FB_PAGE_ACCESS_TOKEN");
  },

  /** Telegram Bot API token from @BotFather. */
  get telegramBotToken(): string | undefined {
    return readOptional("TELEGRAM_BOT_TOKEN");
  },

  /** Shared dashboard password. */
  get adminPassword(): string {
    return read("ADMIN_PASSWORD");
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

  /** Secret used to sign the session cookie. */
  get sessionSecret(): string {
    const secret = read("SESSION_SECRET");
    if (secret.length < 16) {
      throw new Error(
        "SESSION_SECRET must be at least 16 characters long. Generate one with: openssl rand -hex 32",
      );
    }
    return secret;
  },
} as const;

/** Name of the signed session cookie. */
export const SESSION_COOKIE = "connectme_session";

/** Meta Graph API base URL for the configured version. */
export function graphUrl(path: string): string {
  return `https://graph.facebook.com/${config.graphVersion}/${path}`;
}