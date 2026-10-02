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

import { config } from "../config";

/**
 * Fetches the user profile (first_name, last_name, name, profile_pic) for a Messenger PSID.
 * Returns nulls gracefully if the call fails or permissions are missing.
 */
export async function fetchMessengerUserProfile(
  psid: string,
  accessToken?: string,
): Promise<{ name: string | null; avatarUrl: string | null }> {
  const token = accessToken ?? config.fbPageAccessToken ?? process.env.FB_PAGE_ACCESS_TOKEN?.trim();
  if (!token) return { name: null, avatarUrl: null };

  try {
    const version = config.graphVersion || "v21.0";
    const url = `https://graph.facebook.com/${version}/${psid}?fields=first_name,last_name,name,profile_pic&access_token=${token}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[meta] profile fetch HTTP ${response.status} for PSID ${psid}: ${errText}`);
      return { name: null, avatarUrl: null };
    }
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

interface GraphAttachment {
  id?: string;
  mime_type?: string;
  name?: string;
  image_data?: { url?: string; preview_url?: string };
  video_data?: { url?: string; preview_url?: string };
  file_url?: string;
}

/**
 * Fetches attachment details from Meta Graph API for a given message ID (MID).
 */
export async function fetchMessengerMessageAttachment(
  mid: string,
  accessToken?: string,
): Promise<{ mediaUrl: string | null; type: "image" | "video" | "audio" | "document" | "other"; text: string | null }> {
  const token = accessToken ?? config.fbPageAccessToken ?? process.env.FB_PAGE_ACCESS_TOKEN?.trim();
  if (!token) return { mediaUrl: null, type: "other", text: null };

  try {
    const version = config.graphVersion || "v21.0";
    const url = `https://graph.facebook.com/${version}/${mid}?fields=attachments,message&access_token=${token}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return { mediaUrl: null, type: "other", text: null };
    const data = (await response.json()) as {
      attachments?: { data?: GraphAttachment[] };
      message?: string;
    };

    const first = data.attachments?.data?.[0];
    if (!first) return { mediaUrl: null, type: "other", text: null };

    const mime = (first.mime_type || "").toLowerCase();
    let type: "image" | "video" | "audio" | "document" | "other" = "other";
    let mediaUrl: string | null = null;

    if (first.image_data?.url || mime.startsWith("image/")) {
      type = "image";
      mediaUrl = first.image_data?.url || first.file_url || null;
    } else if (first.video_data?.url || mime.startsWith("video/")) {
      type = "video";
      mediaUrl = first.video_data?.url || first.file_url || null;
    } else if (mime.startsWith("audio/")) {
      type = "audio";
      mediaUrl = first.file_url || null;
    } else if (first.file_url) {
      type = "document";
      mediaUrl = first.file_url;
    }

    return {
      mediaUrl,
      type,
      text: data.message || first.name || null,
    };
  } catch (error) {
    console.warn(`[meta] failed to fetch attachment for MID ${mid}:`, error);
    return { mediaUrl: null, type: "other", text: null };
  }
}