import { recordInbound } from "../store";
import type { MessageType } from "../types";
import { fetchSlackChannelName, fetchSlackUserProfile } from "./client";
import type { SlackMessageEvent } from "./types";

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

  // Label the conversation: DM uses sender name, channel uses #channelName
  let contactName = senderName;
  const isDirectMessage = event.channel_type === "im" || event.channel_type === "mpim" || channelId.startsWith("D");

  try {
    const channelName = await fetchSlackChannelName(token, channelId);
    if (channelName) {
      contactName = isDirectMessage ? (senderName || channelName) : `#${channelName.replace(/^#+/, "")}`;
    } else if (isDirectMessage) {
      contactName = senderName;
    } else if (channelId.startsWith("C") || channelId.startsWith("G")) {
      contactName = `#${channelId}`;
    }
  } catch (err) {
    console.warn("[slack] channel name fetch error:", err);
  }

  let text: string | null = event.text || null;
  let type: MessageType = "text";
  let mediaUrl: string | null = null;

  // Handle uploaded files
  const firstFile = event.files?.[0];
  if (firstFile) {
    const mime = (firstFile.mimetype || "").toLowerCase();
    mediaUrl = firstFile.url_private_download || firstFile.url_private || firstFile.thumb_1024 || null;

    if (mime.startsWith("image/")) {
      type = "image";
    } else if (mime.startsWith("video/")) {
      type = "video";
    } else if (mime.startsWith("audio/")) {
      type = "audio";
    } else {
      type = "document";
    }

    if (!text && firstFile.name) {
      text = firstFile.name;
    }
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
      mediaUrl,
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
