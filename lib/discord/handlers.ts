import { recordInbound } from "../store";
import type { MediaKind, MessageMedia, MessageType } from "../types";
import { fetchDiscordChannelName, fetchDiscordUserProfile } from "./client";
import type { DiscordMessage } from "./types";

function kindForMime(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export async function handleDiscordMessage(
  token: string,
  userId: string,
  message: DiscordMessage,
): Promise<void> {
  // Ignore messages from bots to prevent self-looping
  if (message.author.bot) return;

  const channelId = message.channel_id;
  const messageId = message.id;
  const author = message.author;

  let senderName = author.global_name || author.username || `User ${author.id}`;
  let senderAvatarUrl: string | null = null;

  try {
    const profile = await fetchDiscordUserProfile(token, author);
    senderName = profile.name;
    senderAvatarUrl = profile.avatarUrl;
  } catch (err) {
    console.warn("[discord] profile fetch error:", err);
  }

  // The conversation is the channel itself, so title it by channel name, not sender.
  let contactName = senderName;
  try {
    const channelName = await fetchDiscordChannelName(token, channelId);
    if (channelName) {
      contactName = `#${channelName}`;
      senderAvatarUrl = null;
    }
  } catch (err) {
    console.warn("[discord] channel fetch error:", err);
  }

  let text: string | null = message.content || null;
  let type: MessageType = "text";
  const media: MessageMedia[] = [];

  // Discord puts every file on one message in `attachments`; all of them are kept.
  for (const attachment of message.attachments ?? []) {
    const kind = kindForMime(attachment.content_type || "");
    media.push({
      url: attachment.url,
      type: kind,
      mimeType: attachment.content_type || "application/octet-stream",
      name: attachment.filename ?? null,
      size: attachment.size ?? null,
    });
  }

  if (media.length === 0 && message.embeds?.length) {
    // Link previews arrive as embeds; pull the media out of the first one.
    const embed = message.embeds[0];
    const url = embed.image?.url ?? embed.video?.url ?? null;
    if (url) {
      const kind = embed.video?.url ? "video" : "image";
      media.push({
        url,
        type: kind,
        mimeType: kind === "video" ? "video/mp4" : "image/png",
        name: null,
        size: null,
      });
    }
    if (!text) text = embed.description || embed.title || null;
  }

  if (media.length > 0) {
    type = media.find((m) => m.type !== "sticker")?.type ?? media[0].type;
    if (!text) text = media[0].name;
  }

  try {
    const inserted = await recordInbound({
      userId,
      channel: "discord",
      externalId: messageId,
      senderExternalId: channelId, // reply to this channel
      senderName: contactName,
      senderAvatarUrl,
      text,
      media,
      type,
      createdAt: new Date(message.timestamp || Date.now()),
    });

    if (inserted) {
      console.log(`[webhook] discord inbound ${messageId} (${type}) from ${senderName} in ${contactName} (channel ${channelId})`);
    } else {
      console.log(`[webhook] discord duplicate ${messageId}, ignored`);
    }
  } catch (error) {
    console.error("[webhook] failed to store discord message:", error);
  }
}
