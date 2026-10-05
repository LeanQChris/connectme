import { recordInbound } from "../store";
import type { MediaKind, MessageMedia, MessageType } from "../types";
import { fetchSlackChannelName, fetchSlackUserProfile } from "./client";
import type { SlackMessageEvent } from "./types";

function kindForMime(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export async function handleSlackMessage(
  token: string,
  userId: string,
  event: SlackMessageEvent,
  teamId?: string,
): Promise<void> {
  // Ignore bot messages and hidden/message_changed subtypes to prevent self-looping
  if (event.bot_id || event.subtype === "bot_message" || event.hidden) {
    return;
  }

  // Ignore message edits or deletions if no new text/user
  if (!event.user && !event.text && !event.files?.length) {
    return;
  }

  const channelId = event.channel;
  const messageId = event.ts;
  const slackUserId = event.user || "unknown";

  let senderName = `Slack User ${slackUserId}`;
  let senderAvatarUrl: string | null = null;

  if (event.user) {
    try {
      const profile = await fetchSlackUserProfile(token, event.user);
      senderName = profile.name;
      senderAvatarUrl = profile.avatarUrl;
    } catch (err) {
      console.warn("[slack] profile fetch error:", err);
    }
  }

  // Label the conversation: DM uses sender name, channel uses #channelName or #channelId
  const isDirectMessage =
    event.channel_type === "im" ||
    event.channel_type === "mpim" ||
    channelId.startsWith("D");

  let contactName = isDirectMessage ? senderName : `#${channelId}`;

  try {
    const channelName = await fetchSlackChannelName(token, channelId);
    if (channelName) {
      contactName = isDirectMessage ? (senderName || channelName) : `#${channelName.replace(/^#+/, "")}`;
    }
  } catch (err) {
    console.warn("[slack] channel name fetch error:", err);
  }

  let text: string | null = event.text || null;
  let type: MessageType = "text";
  const media: MessageMedia[] = [];

  // A Slack message can carry several files; private URLs go through the proxy.
  for (const file of event.files ?? []) {
    const url = file.url_private_download || file.url_private || file.thumb_1024 || null;
    if (!url) continue;
    media.push({
      url,
      type: kindForMime(file.mimetype || ""),
      mimeType: file.mimetype || "application/octet-stream",
      name: file.name ?? null,
      size: file.size ?? null,
    });
  }

  if (media.length > 0) {
    type = media[0].type;
    if (!text) text = media[0].name;
  }

  // Enrich Slack user mentions (<@U12345> -> <@U12345|Real Name>)
  if (text && text.includes("<@")) {
    const userMentionRegex = /<@([A-Z0-9]+)>/g;
    const uids = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = userMentionRegex.exec(text)) !== null) {
      uids.add(m[1]);
    }
    for (const uid of uids) {
      try {
        const uProfile = await fetchSlackUserProfile(token, uid);
        if (uProfile?.name && !uProfile.name.startsWith("User ")) {
          text = text.replaceAll(`<@${uid}>`, `<@${uid}|${uProfile.name}>`);
        }
      } catch {
        // ignore profile fetch error
      }
    }
  }

  // Enrich Slack channel mentions (<#C12345> -> <#C12345|channel-name>)
  if (text && text.includes("<#")) {
    const chanMentionRegex = /<#([A-Z0-9]+)>/g;
    const cids = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = chanMentionRegex.exec(text)) !== null) {
      cids.add(m[1]);
    }
    for (const cid of cids) {
      try {
        const cName = await fetchSlackChannelName(token, cid);
        if (cName) {
          text = text.replaceAll(`<#${cid}>`, `<#${cid}|${cName}>`);
        }
      } catch {
        // ignore channel fetch error
      }
    }
  }

  try {
    const inserted = await recordInbound({
      userId,
      channel: "slack",
      accountId: teamId || null,
      externalId: messageId,
      senderExternalId: channelId, // reply back to this channel/DM
      senderName: contactName,
      senderAvatarUrl,
      text,
      media,
      type,
      createdAt: new Date(Number.parseFloat(messageId) * 1000 || Date.now()),
    });

    if (inserted) {
      console.log(
        `[webhook] slack inbound ${messageId} (${type}) from ${senderName} in ${contactName} (channel ${channelId})`,
      );
    } else {
      console.log(`[webhook] slack duplicate ${messageId}, ignored`);
    }
  } catch (error) {
    console.error("[webhook] failed to store slack message:", error);
  }
}
