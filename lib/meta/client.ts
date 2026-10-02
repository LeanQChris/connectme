import { formatMetaError } from "./verify";

/** Raised when the Graph API answers with a non-2xx status. */
export class MetaSendError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MetaSendError";
    this.status = status;
  }
}

/** Raised when a channel has no credentials configured yet. */
export class ChannelNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelNotConfiguredError";
  }
}

/**
 * POSTs JSON to the Graph API and returns the parsed body, throwing
 * MetaSendError with Meta's own error message on failure.
 */
export async function postGraphJson(
  url: string,
  accessToken: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // Never log the access token, only what Meta said.
    throw new MetaSendError(formatMetaError(payload), response.status);
  }

  return payload;
}

/**
 * Fetches the user profile (first_name, last_name, name, profile_pic) for a Messenger PSID.
 * Returns nulls gracefully if the call fails or permissions are missing.
 */
export async function fetchMessengerUserProfile(
  psid: string,
  accessToken?: string,
): Promise<{ name: string | null; avatarUrl: string | null }> {
  const token = accessToken ?? process.env.FB_PAGE_ACCESS_TOKEN?.trim();
  if (!token) return { name: null, avatarUrl: null };

  try {
    const version = process.env.GRAPH_VERSION?.trim() || "v21.0";
    const url = `https://graph.facebook.com/${version}/${psid}?fields=first_name,last_name,name,profile_pic&access_token=${token}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return { name: null, avatarUrl: null };
    const data = (await response.json()) as {
      first_name?: string;
      last_name?: string;
      name?: string;
      profile_pic?: string;
    };

    const fullName =
      data.name?.trim() ||
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
      null;

    return {
      name: fullName,
      avatarUrl: data.profile_pic ?? null,
    };
  } catch (error) {
    console.warn(`[meta] failed to fetch profile for PSID ${psid}:`, error);
    return { name: null, avatarUrl: null };
  }
}