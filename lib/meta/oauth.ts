import { createHmac, randomBytes } from "node:crypto";
import { config, graphUrl } from "@/lib/config";

const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  // Re-enable once the Instagram product is enabled on the Meta app and
  // App Review has granted them; the OAuth dialog hard-fails otherwise.
  // "instagram_basic",
  // "instagram_manage_messages",
];

export interface MetaPageAccount {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  };
}

/**
 * Builds a tamper-proof state string containing the user's ID and timestamp.
 */
export function createOAuthState(userId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = JSON.stringify({ userId, nonce, t: Date.now() });
  const hmac = createHmac("sha256", config.encryptionKey).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ payload, hmac })).toString("base64url");
}

/**
 * Validates and unpacks the OAuth state string.
 */
export function verifyOAuthState(state: string): { userId: string } | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const { payload, hmac } = JSON.parse(raw);
    const expected = createHmac("sha256", config.encryptionKey).update(payload).digest("hex");
    if (hmac !== expected) return null;

    const parsed = JSON.parse(payload);
    // Disallow states older than 15 minutes
    if (Date.now() - parsed.t > 15 * 60 * 1000) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

/**
 * Builds the Meta OAuth authorization URL.
 */
export function getMetaAuthorizationUrl(userId: string, redirectUri: string): string {
  const appId = config.metaAppId;
  if (!appId) {
    throw new Error("APP_ID is not configured in server environment.");
  }

  const state = createOAuthState(userId);
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: META_OAUTH_SCOPES.join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/${config.graphVersion}/dialog/oauth?${params.toString()}`;
}

/**
 * Exchanges the temporary authorization code for a short-lived user access token.
 */
export async function exchangeCodeForUserToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const appId = config.metaAppId;
  const appSecret = config.metaAppSecret;
  if (!appId || !appSecret) {
    throw new Error("APP_ID or APP_SECRET is missing.");
  }

  const url = new URL(graphUrl(config.graphVersion, "oauth/access_token"));
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || "Failed to exchange authorization code for access token.");
  }

  return data.access_token as string;
}

/**
 * Exchanges a short-lived user token for a long-lived user token (~60 days).
 */
export async function getLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const appId = config.metaAppId;
  const appSecret = config.metaAppSecret;
  if (!appId || !appSecret) {
    throw new Error("APP_ID or APP_SECRET is missing.");
  }

  const url = new URL(graphUrl(config.graphVersion, "oauth/access_token"));
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || "Failed to get long-lived user token.");
  }

  return data.access_token as string;
}

/**
 * Fetches Facebook Pages and connected Instagram Business accounts for the authenticated user.
 */
export async function getAccountsAndPages(userToken: string): Promise<MetaPageAccount[]> {
  const url = new URL(graphUrl(config.graphVersion, "me/accounts"));
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}",
  );
  url.searchParams.set("access_token", userToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data.data)) {
    throw new Error(data.error?.message || "Failed to fetch Facebook pages.");
  }

  return data.data as MetaPageAccount[];
}

/**
 * Subscribes a Facebook Page to the Meta App's webhooks.
 * This tells Meta to route messages sent to this Page to our central webhook endpoint.
 */
export async function subscribePageToWebhook(
  pageId: string,
  pageAccessToken: string,
): Promise<boolean> {
  const url = new URL(graphUrl(config.graphVersion, `${pageId}/subscribed_apps`));
  url.searchParams.set(
    "subscribed_fields",
    "messages,messaging_postbacks,message_reads,message_deliveries",
  );
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString(), { method: "POST" });
  const data = await res.json();
  return Boolean(res.ok && data.success);
}
