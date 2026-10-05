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

/** Discord's multipart upload limit: 10 files (25MB each) per message. */
const DISCORD_MAX_FILES = 10;

export interface DiscordUpload {
  url: string;
  filename: string;
  bytes: Uint8Array;
}

/**
 * Posts one or more files as real attachments.
 *
 * Discord takes a single multipart body: `payload_json` plus `files[n]`. Images
 * only used to go out as an embed, which meant anything else arrived as a bare
 * link; this sends the bytes instead.
 */
export async function sendDiscordFiles(
  token: string,
  channelId: string,
  text: string,
  files: DiscordUpload[],
): Promise<{ messageId: string }> {
  if (!token) {
    throw new ChannelNotConfiguredError(
      "Discord is not configured. Add your bot token in Settings.",
    );
  }

  const payload: Record<string, unknown> = {};
  if (text) payload.content = text;
  if (files.length === 1) {
    payload.attachments = [{ id: 0, filename: files[0].filename }];
  }

  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  files.slice(0, DISCORD_MAX_FILES).forEach((file, index) => {
    form.append(`files[${index}]`, new Blob([file.bytes as BlobPart]), file.filename);
  });

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}` },
    body: form,
  });

  const data = (await response.json().catch(() => null)) as
    | (DiscordMessage & { message?: string })
    | null;

  if (!response.ok || !data?.id) {
    throw new Error(data?.message || `Failed to send Discord files: HTTP ${response.status}`);
  }

  return { messageId: data.id };
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

const discordChannelCache = new Map<string, string>();

/** A Discord conversation is a text channel, so its display name is the channel name. */
export async function fetchDiscordChannelName(
  token: string,
  channelId: string,
): Promise<string | null> {
  const cached = discordChannelCache.get(channelId);
  if (cached) return cached;

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { name?: string };
  const name = data.name?.trim() || null;
  if (name) discordChannelCache.set(channelId, name);
  return name;
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
