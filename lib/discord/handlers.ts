import { recordInbound } from "../store";
import type { MessageType } from "../types";
import { fetchDiscordUserProfile } from "./client";
import type { DiscordMessage } from "./types";

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

  let text: string | null = message.content || null;
  let type: MessageType = "text";
  let mediaUrl: string | null = null;

  // Check attachments
  const firstAttachment = message.attachments?.[0];
  if (firstAttachment) {
    const mime = (firstAttachment.content_type || "").toLowerCase();
    mediaUrl = firstAttachment.url;

    if (mime.startsWith("image/")) {
      type = "image";
    } else if (mime.startsWith("video/")) {
      type = "video";
    } else if (mime.startsWith("audio/")) {
      type = "audio";
    } else {
      type = "document";
    }

    if (!text) {
      text = firstAttachment.filename || null;
    }
  } else if (message.embeds && message.embeds.length > 0) {
    const firstEmbed = message.embeds[0];
    if (firstEmbed.image?.url) {
      type = "image";
      mediaUrl = firstEmbed.image.url;
    } else if (firstEmbed.video?.url) {
      type = "video";
      mediaUrl = firstEmbed.video.url;
    }

    if (!text) {
      text = firstEmbed.description || firstEmbed.title || null;
    }
  }

  try {
    const inserted = await recordInbound({
      userId,
      channel: "discord",
      externalId: messageId,
      senderExternalId: channelId, // reply to this channel
      senderName,
      senderAvatarUrl,
      text,
      mediaUrl,
      type,
      createdAt: new Date(message.timestamp || Date.now()),
    });

    if (inserted) {
      console.log(`[webhook] discord inbound ${messageId} (${type}) from ${senderName} (channel ${channelId})`);
    } else {
      console.log(`[webhook] discord duplicate ${messageId}, ignored`);
    }
  } catch (error) {
    console.error("[webhook] failed to store discord message:", error);
  }
}
