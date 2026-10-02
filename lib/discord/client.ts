import { ChannelNotConfiguredError } from "../meta/client";
import type { DiscordMessage, DiscordUser } from "./types";

const discordProfileCache = new Map<string, { name: string; avatarUrl: string | null }>();

export async function sendDiscordMessage(
  token: string,
  channelId: string,
  text: string,
): Promise<{ messageId: string }> {
  if (!token) {
    throw new ChannelNotConfiguredError(
      "Discord is not configured. Add your bot token in Settings.",
    );
  }

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: text,
    }),
  });

  const data = (await response.json()) as DiscordMessage & { message?: string; code?: number };

  if (!response.ok || !data.id) {
    throw new Error(data.message || `Failed to send Discord message: HTTP ${response.status}`);
  }

  return { messageId: data.id };
}

export async function sendDiscordAttachment(
  token: string,
  channelId: string,
  mediaUrl: string,
  type: "image" | "audio" | "video" | "document",
  caption?: string,
): Promise<{ messageId: string }> {
  if (!token) {
    throw new ChannelNotConfiguredError(
      "Discord is not configured. Add your bot token in Settings.",
    );
  }

  // Discord allows sending embeds with image URLs or uploading files
  if (type === "image") {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: caption || undefined,
        embeds: [
          {
            image: { url: mediaUrl },
          },
        ],
      }),
    });

    const data = (await response.json()) as DiscordMessage & { message?: string };
    if (!response.ok || !data.id) {
      throw new Error(data.message || `Failed to send Discord image: HTTP ${response.status}`);
    }
    return { messageId: data.id };
  }

  // For documents, audio, or video: send message with attachment link
  const content = caption ? `${caption}\n${mediaUrl}` : mediaUrl;
  return sendDiscordMessage(token, channelId, content);
}

export async function fetchDiscordUserProfile(
  token: string,
  user: DiscordUser,
): Promise<{ name: string; avatarUrl: string | null }> {
  const userKey = user.id;
  const fullName = user.global_name?.trim() || user.username || `Discord User ${user.id}`;

  let avatarUrl: string | null = null;
  if (user.avatar) {
    avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }

  const cached = discordProfileCache.get(userKey);
  if (cached) return cached;

  const result = { name: fullName, avatarUrl };
  discordProfileCache.set(userKey, result);
  return result;
}

export async function verifyDiscordBot(token: string): Promise<{ ok: boolean; bot?: DiscordUser; error?: string }> {
  if (!token) return { ok: false, error: "Bot token is missing" };

  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });
    const data = (await response.json()) as DiscordUser & { message?: string };

    if (!response.ok || !data.id) {
      return { ok: false, error: data.message || `HTTP ${response.status}` };
    }

    return { ok: true, bot: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

/**
 * Registers the global `/connectme` slash command on Discord for this bot.
 */
export async function registerDiscordSlashCommands(
  token: string,
): Promise<{ ok: boolean; commands?: unknown; error?: string }> {
  const botInfo = await verifyDiscordBot(token);
  if (!botInfo.ok || !botInfo.bot?.id) {
    return { ok: false, error: botInfo.error || "Failed to fetch bot ID" };
  }

  const applicationId = botInfo.bot.id;

  const response = await fetch(
    `https://discord.com/api/v10/applications/${applicationId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          name: "connectme",
          description: "Send a message to the ConnectMe support team",
          options: [
            {
              name: "message",
              description: "Your question or message",
              type: 3, // STRING
              required: true,
            },
          ],
        },
      ]),
    }
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, error: (data as { message?: string })?.message || `HTTP ${response.status}` };
  }

  return { ok: true, commands: data };
}
