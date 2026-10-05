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
 * Fetches the display name of a Slack channel or DM using multiple Slack APIs.
 */
export async function fetchSlackChannelName(
  rawToken: string,
  channelId: string,
): Promise<string | null> {
  const token = rawToken.trim();
  const cached = slackChannelCache.get(channelId);
  if (cached) return cached;

  // 1. Try conversations.info directly
  try {
    const response = await fetch(
      `https://slack.com/api/conversations.info?channel=${encodeURIComponent(channelId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.ok) {
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        channel?: { name?: string; is_im?: boolean; is_mpim?: boolean; user?: string };
      };

      if (data.ok && data.channel) {
        // Direct Message (IM) - resolve recipient user profile
        if (data.channel.is_im && data.channel.user) {
          const profile = await fetchSlackUserProfile(token, data.channel.user);
          if (profile?.name) {
            slackChannelCache.set(channelId, profile.name);
            return profile.name;
          }
          return null;
        }

        const name = data.channel.name?.trim() || null;
        if (name) {
          slackChannelCache.set(channelId, name);
          return name;
        }
      } else if (data.error === "not_in_channel") {
        // Attempt to auto-join public channel
        try {
          const joinRes = await fetch("https://slack.com/api/conversations.join", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({ channel: channelId }),
          });
          const joinData = (await joinRes.json()) as { ok: boolean; channel?: { name?: string } };
          if (joinData.ok && joinData.channel?.name) {
            const joinedName = joinData.channel.name.trim();
            slackChannelCache.set(channelId, joinedName);
            return joinedName;
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn(`[slack] conversations.info fetch error for ${channelId}:`, err);
  }

  // 2. Try users.conversations (all channels & groups the bot is a member of)
  try {
    const usersConvsRes = await fetch(
      "https://slack.com/api/users.conversations?types=public_channel,private_channel,mpim,im&limit=1000",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (usersConvsRes.ok) {
      const usersData = (await usersConvsRes.json()) as {
        ok: boolean;
        channels?: Array<{ id: string; name?: string; is_im?: boolean; user?: string }>;
      };

      if (usersData.ok && Array.isArray(usersData.channels)) {
        for (const ch of usersData.channels) {
          if (ch.id && ch.name) {
            slackChannelCache.set(ch.id, ch.name.trim());
          }
        }
        if (slackChannelCache.has(channelId)) {
          return slackChannelCache.get(channelId)!;
        }
      }
    }
  } catch (err) {
    console.warn("[slack] users.conversations fallback error:", err);
  }

  // 3. Fallback: list all public channels in the workspace
  try {
    const listRes = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel&limit=1000",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (listRes.ok) {
      const listData = (await listRes.json()) as {
        ok: boolean;
        error?: string;
        channels?: Array<{ id: string; name?: string }>;
      };

      if (listData.ok && Array.isArray(listData.channels)) {
        for (const ch of listData.channels) {
          if (ch.id && ch.name) {
            slackChannelCache.set(ch.id, ch.name.trim());
          }
        }
        if (slackChannelCache.has(channelId)) {
          return slackChannelCache.get(channelId)!;
        }
      }
    }
  } catch (err) {
    console.warn("[slack] conversations.list fallback failed:", err);
  }

  return null;
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

export interface SlackDirectoryUser {
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  title?: string;
  isBot?: boolean;
}

export interface SlackDirectoryChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  topic?: string;
  numMembers?: number;
}

export interface SlackDirectory {
  users: SlackDirectoryUser[];
  channels: SlackDirectoryChannel[];
}

/**
 * Fetches all workspace users and channels for the new conversation picker.
 */
export async function fetchSlackDirectory(rawToken: string): Promise<SlackDirectory> {
  const token = rawToken.trim();
  const users: SlackDirectoryUser[] = [];
  const channels: SlackDirectoryChannel[] = [];
  const seenChannelIds = new Set<string>();

  // 1. Fetch Users
  try {
    const usersRes = await fetch("https://slack.com/api/users.list?limit=500", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      if (usersData.ok && Array.isArray(usersData.members)) {
        for (const m of usersData.members) {
          // Skip deleted users and USLACKBOT
          if (m.deleted || m.id === "USLACKBOT") continue;
          const displayName =
            m.profile?.display_name?.trim() ||
            m.profile?.real_name?.trim() ||
            m.real_name?.trim() ||
            m.name ||
            `User ${m.id}`;

          const avatar =
            m.profile?.image_72 ||
            m.profile?.image_192 ||
            m.profile?.image_512 ||
            null;

          users.push({
            id: m.id,
            name: m.name || m.id,
            displayName,
            avatarUrl: avatar,
            title: m.profile?.title || undefined,
            isBot: Boolean(m.is_bot),
          });
        }
      }
    }
  } catch (err) {
    console.warn("[slack] users.list directory fetch failed:", err);
  }

  // 2. Fetch Bot Member Channels (users.conversations)
  try {
    const userConvsRes = await fetch(
      "https://slack.com/api/users.conversations?types=public_channel,private_channel&limit=500",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (userConvsRes.ok) {
      const data = await userConvsRes.json();
      if (data.ok && Array.isArray(data.channels)) {
        for (const c of data.channels) {
          if (c.id && c.name && !seenChannelIds.has(c.id)) {
            seenChannelIds.add(c.id);
            slackChannelCache.set(c.id, c.name.trim());
            channels.push({
              id: c.id,
              name: c.name.trim(),
              isPrivate: Boolean(c.is_private),
              topic: c.topic?.value || c.purpose?.value || undefined,
              numMembers: c.num_members,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[slack] users.conversations directory fetch failed:", err);
  }

  // 3. Fetch Public Channels (conversations.list)
  try {
    const listRes = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel&limit=500",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.ok && Array.isArray(listData.channels)) {
        for (const c of listData.channels) {
          if (c.id && c.name && !seenChannelIds.has(c.id)) {
            seenChannelIds.add(c.id);
            slackChannelCache.set(c.id, c.name.trim());
            channels.push({
              id: c.id,
              name: c.name.trim(),
              isPrivate: false,
              topic: c.topic?.value || c.purpose?.value || undefined,
              numMembers: c.num_members,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[slack] conversations.list directory fetch failed:", err);
  }

  // Sort channels alphabetically
  channels.sort((a, b) => a.name.localeCompare(b.name));
  // Sort users alphabetically (non-bots first)
  users.sort((a, b) => {
    if (a.isBot !== b.isBot) return a.isBot ? 1 : -1;
    return a.displayName.localeCompare(b.displayName);
  });

  return { users, channels };
}
