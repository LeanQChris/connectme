import { ChannelNotConfiguredError } from "../meta/client";
import type { SlackAuthTestResponse, SlackUserProfile } from "./types";

const slackProfileCache = new Map<string, SlackUserProfile>();
const slackChannelCache = new Map<string, string>();

/**
 * Sends a plain or formatted message to a Slack channel or DM.
 */
export async function sendSlackMessage(
  token: string,
  channelId: string,
  text: string,
  threadTs?: string,
): Promise<{ messageId: string }> {
  if (!token) {
    throw new ChannelNotConfiguredError(
      "Slack is not configured. Add your bot token in Settings.",
    );
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: channelId,
      text,
      thread_ts: threadTs || undefined,
    }),
  });

  const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };

  if (!response.ok || !data.ok || !data.ts) {
    throw new Error(data.error || `Failed to send Slack message: HTTP ${response.status}`);
  }

  return { messageId: data.ts };
}

/**
 * Sends a message with an attached media URL or block preview to Slack.
 */
export async function sendSlackAttachment(
  token: string,
  channelId: string,
  mediaUrl: string,
  type: "image" | "audio" | "video" | "document",
  caption?: string,
  threadTs?: string,
): Promise<{ messageId: string }> {
  if (!token) {
    throw new ChannelNotConfiguredError(
      "Slack is not configured. Add your bot token in Settings.",
    );
  }

  if (type === "image") {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: channelId,
        text: caption || "Image attachment",
        thread_ts: threadTs || undefined,
        blocks: [
          ...(caption
            ? [
                {
                  type: "section",
                  text: { type: "mrkdwn", text: caption },
                },
              ]
            : []),
          {
            type: "image",
            image_url: mediaUrl,
            alt_text: caption || "Image attachment",
          },
        ],
      }),
    });

    const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };
    if (!response.ok || !data.ok || !data.ts) {
      throw new Error(data.error || `Failed to send Slack image: HTTP ${response.status}`);
    }
    return { messageId: data.ts };
  }

  // Audio / Video / Document fallback with link
  const content = caption ? `${caption}\n${mediaUrl}` : mediaUrl;
  return sendSlackMessage(token, channelId, content, threadTs);
}

/**
 * Fetches user profile (display name, avatar) for a Slack user ID.
 */
export async function fetchSlackUserProfile(
  token: string,
  slackUserId: string,
): Promise<SlackUserProfile> {
  const cached = slackProfileCache.get(slackUserId);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://slack.com/api/users.info?user=${encodeURIComponent(slackUserId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      return { id: slackUserId, name: `User ${slackUserId}`, avatarUrl: null };
    }

    const data = (await response.json()) as {
      ok: boolean;
      user?: {
        name?: string;
        real_name?: string;
        profile?: {
          display_name?: string;
          real_name?: string;
          image_72?: string;
          image_192?: string;
          image_512?: string;
        };
      };
    };

    if (!data.ok || !data.user) {
      return { id: slackUserId, name: `User ${slackUserId}`, avatarUrl: null };
    }

    const displayName =
      data.user.profile?.display_name?.trim() ||
      data.user.profile?.real_name?.trim() ||
      data.user.real_name?.trim() ||
      data.user.name ||
      `User ${slackUserId}`;

    const avatar =
      data.user.profile?.image_192 ||
      data.user.profile?.image_72 ||
      data.user.profile?.image_512 ||
      null;

    const result: SlackUserProfile = {
      id: slackUserId,
      name: displayName,
      real_name: data.user.real_name,
      avatarUrl: avatar,
    };

    slackProfileCache.set(slackUserId, result);
    return result;
  } catch {
    return { id: slackUserId, name: `User ${slackUserId}`, avatarUrl: null };
  }
}

/**
 * Fetches the display name of a Slack channel.
 */
export async function fetchSlackChannelName(
  token: string,
  channelId: string,
): Promise<string | null> {
  const cached = slackChannelCache.get(channelId);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://slack.com/api/conversations.info?channel=${encodeURIComponent(channelId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok: boolean;
      channel?: { name?: string; is_im?: boolean };
    };

    if (!data.ok || !data.channel) return null;

    if (data.channel.is_im) {
      return null;
    }

    const name = data.channel.name?.trim() || null;
    if (name) slackChannelCache.set(channelId, name);
    return name;
  } catch {
    return null;
  }
}

/**
 * Tests authentication credentials using auth.test.
 */
export async function verifySlackBot(
  token: string,
): Promise<SlackAuthTestResponse> {
  if (!token) {
    return { ok: false, error: "Bot token is missing" };
  }

  try {
    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    const data = (await response.json()) as SlackAuthTestResponse;
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
