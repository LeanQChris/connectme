/**
 * Inbound webhook handlers. Each one stores what it understands and never
 * throws for a malformed event: a single bad entry must not stop the others.
 */

import { recordInbound, updateOutboundStatus } from "../store";
import type { MessageStatus, MessageType } from "../types";
import type {
  InstagramWebhookBody,
  PageWebhookBody,
  WhatsAppStatus,
  WhatsAppWebhookBody,
} from "./types";

/** The tenant a verified webhook belongs to, plus the tokens its API calls need. */
export interface TenantContext {
  userId: string;
  pageAccessToken: string;
  graphVersion: string;
  waAccessToken: string;
}

const MESSAGE_TYPE_MAP: Record<string, MessageType> = {
  text: "text",
  image: "image",
  audio: "audio",
  video: "video",
  document: "document",
};

/** Known types are stored as-is; everything else becomes a placeholder. */
function mapType(raw: string | undefined): MessageType {
  if (!raw) return "other";
  return MESSAGE_TYPE_MAP[raw] ?? "other";
}

/** Placeholder body for media, since media is not stored yet. */
function placeholder(type: MessageType): string {
  return type === "other" ? "[message]" : `[${type}]`;
}

function unixSecondsToDate(raw: string | undefined): Date {
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date();
  return new Date(seconds * 1000);
}

function formatStatusError(status: WhatsAppStatus): string | null {
  const error = status.errors?.[0];
  if (!error) return null;
  const code = error.code !== undefined ? `[${error.code}] ` : "";
  return `${code}${error.title ?? error.message ?? "Delivery failed"}`;
}

export async function handleWhatsApp(
  tenant: TenantContext,
  body: WhatsAppWebhookBody,
): Promise<void> {
  for (const entry of body.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      if (!value) continue;

      // wa_id -> display name, so an inbound message can name its contact.
      const names = new Map<string, string>();
      for (const contact of value.contacts ?? []) {
        if (contact?.wa_id) names.set(contact.wa_id, contact.profile?.name ?? "");
      }

      for (const error of value.errors ?? []) {
        console.error("[webhook] whatsapp error:", error.code, error.title, error.message);
      }

      for (const message of value.messages ?? []) {
        if (!message?.from || !message.id) {
          console.warn("[webhook] whatsapp message without from/id, skipped");
          continue;
        }

        const rawType = message.type || "text";
        let type: MessageType = "text";
        let text: string | null = null;
        let mediaUrl: string | null = null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawMsg = message as Record<string, any>;

        if (rawType === "text") {
          type = "text";
          text = message.text?.body ?? "";
        } else if (rawType === "image") {
          type = "image";
          const imgId = rawMsg.image?.id;
          if (imgId) mediaUrl = `/api/media?id=${imgId}`;
          text = rawMsg.image?.caption || null;
        } else if (rawType === "video") {
          type = "video";
          const vidId = rawMsg.video?.id;
          if (vidId) mediaUrl = `/api/media?id=${vidId}`;
          text = rawMsg.video?.caption || null;
        } else if (rawType === "audio" || rawType === "voice") {
          type = "audio";
          const audioId = rawMsg.audio?.id || rawMsg.voice?.id;
          if (audioId) mediaUrl = `/api/media?id=${audioId}`;
          text = null;
        } else if (rawType === "document") {
          type = "document";
          const docId = rawMsg.document?.id;
          if (docId) mediaUrl = `/api/media?id=${docId}`;
          text = rawMsg.document?.filename || rawMsg.document?.caption || "Document";
        } else if (rawType === "sticker") {
          type = "image";
          const stickerId = rawMsg.sticker?.id;
          if (stickerId) mediaUrl = `/api/media?id=${stickerId}`;
          text = null;
        } else if (rawType === "interactive") {
          type = "text";
          text =
            rawMsg.interactive?.button_reply?.title ||
            rawMsg.interactive?.list_reply?.title ||
            rawMsg.interactive?.button_reply?.id ||
            rawMsg.interactive?.list_reply?.id ||
            "[Interactive reply]";
        } else if (rawType === "button") {
          type = "text";
          text = rawMsg.button?.text || rawMsg.button?.payload || "[Button response]";
        } else if (rawType === "location") {
          type = "text";
          text = rawMsg.location?.name
            ? `📍 ${rawMsg.location.name} (${rawMsg.location.address || ""})`
            : rawMsg.location?.latitude
              ? `📍 Location: ${rawMsg.location.latitude}, ${rawMsg.location.longitude}`
              : "📍 Location";
        } else if (rawType === "contacts") {
          type = "text";
          const firstContact = rawMsg.contacts?.[0];
          text = firstContact?.name?.formatted_name
            ? `👤 Contact: ${firstContact.name.formatted_name}`
            : "👤 Contact card";
        } else if (rawType === "reaction") {
          type = "text";
          text = rawMsg.reaction?.emoji ? `Reacted ${rawMsg.reaction.emoji}` : "👍";
        } else {
          type = "text";
          text = message.text?.body || rawMsg.caption || `[${rawType}]`;
        }

        try {
          const inserted = await recordInbound({
            userId: tenant.userId,
            channel: "whatsapp",
            externalId: message.id,
            senderExternalId: message.from,
            senderName: names.get(message.from) ?? null,
            text,
            mediaUrl,
            type,
            createdAt: unixSecondsToDate(message.timestamp),
          });
          if (inserted) console.log(`[webhook] whatsapp inbound ${message.id} (${type}) from ${names.get(message.from) || message.from}`);
          else console.log(`[webhook] whatsapp duplicate ${message.id}, ignored`);
        } catch (error) {
          console.error("[webhook] failed to store whatsapp message:", error);
        }
      }

      for (const status of value.statuses ?? []) {
        if (!status?.id) continue;
        const next: MessageStatus | null =
          status.status === "sent" || status.status === "delivered" || status.status === "read"
            ? status.status
            : status.status === "failed"
              ? "failed"
              : null;
        if (!next) continue;
        try {
          const updated = await updateOutboundStatus(
            tenant.userId,
            "whatsapp",
            status.id,
            next,
            formatStatusError(status),
          );
          if (!updated) console.warn(`[webhook] no outbound message for status ${status.id}`);
        } catch (error) {
          console.error("[webhook] failed to update message status:", error);
        }
      }
    }
  }
}

import { fetchMessengerMessageAttachment, fetchMessengerUserProfile } from "./client";

export async function handleMessenger(
  tenant: TenantContext,
  body: PageWebhookBody,
): Promise<void> {
  for (const entry of body.entry ?? []) {
    for (const event of entry?.messaging ?? []) {
      const message = event?.message;
      if (!message) continue;

      // Echos are the Page's own outgoing messages. We already store those.
      if (message.is_echo) continue;

      const senderId = event.sender?.id;
      const mid = message.mid;
      if (!senderId || !mid) {
        console.warn("[webhook] messenger event without sender/mid, skipped");
        continue;
      }

      const timestamp = typeof event.timestamp === "number" ? event.timestamp : Date.now();
      const firstAttachment = message.attachments?.[0];
      let mediaUrl: string | null = null;
      let type: MessageType = "text";
      let text = message.text ?? null;

      if (firstAttachment) {
        const attachType = firstAttachment.type;
        if (attachType === "image") type = "image";
        else if (attachType === "audio") type = "audio";
        else if (attachType === "video") type = "video";
        else if (attachType === "file") type = "document";
        else type = "other";

        mediaUrl = firstAttachment.payload?.url ?? null;
        if (!text) {
          text = firstAttachment.title || firstAttachment.payload?.title || null;
        }
      } else if (message.text !== undefined) {
        type = "text";
      } else {
        type = "other";
      }

      // If mediaUrl is still missing but message was an attachment, query Graph API
      if (!mediaUrl && (message.attachments?.length || type !== "text")) {
        try {
          const attachData = await fetchMessengerMessageAttachment(
            mid,
            tenant.pageAccessToken,
            tenant.graphVersion,
          );
          if (attachData.mediaUrl) {
            mediaUrl = attachData.mediaUrl;
            type = attachData.type;
            if (!text && attachData.text) text = attachData.text;
          }
        } catch {
          // ignore
        }
      }

      // Fetch user profile name and profile picture from Graph API
      let senderName: string | null = null;
      let senderAvatarUrl: string | null = null;
      try {
        const profile = await fetchMessengerUserProfile(
          senderId,
          tenant.pageAccessToken,
          tenant.graphVersion,
        );
        senderName = profile.name;
        senderAvatarUrl = profile.avatarUrl;
      } catch (err) {
        console.warn("[webhook] could not fetch messenger profile:", err);
      }

      try {
        const inserted = await recordInbound({
          userId: tenant.userId,
          channel: "messenger",
          accountId: entry?.id,
          externalId: mid,
          senderExternalId: senderId,
          senderName,
          senderAvatarUrl,
          text,
          mediaUrl,
          type,
          createdAt: new Date(timestamp),
        });
        if (inserted) console.log(`[webhook] messenger inbound ${mid} (${type}) from ${senderName ?? senderId}`);
        else console.log(`[webhook] messenger duplicate ${mid}, ignored`);
      } catch (error) {
        console.error("[webhook] failed to store messenger message:", error);
      }
    }
  }
}

/**
 * Instagram Messaging (classic, Facebook Login).
 *
 * Same payload shape as Messenger: `sender.id` is the Instagram-scoped id of
 * the customer, and `is_echo` marks our own outgoing messages. Attachments come
 * with their payload URL inline, so no extra Graph call is needed.
 */
export async function handleInstagram(
  tenant: TenantContext,
  body: InstagramWebhookBody,
): Promise<void> {
  for (const entry of body.entry ?? []) {
    for (const event of entry?.messaging ?? []) {
      const message = event?.message;
      if (!message) continue;

      if (message.is_echo) continue;

      const senderId = event.sender?.id;
      const mid = message.mid;
      if (!senderId || !mid) {
        console.warn("[webhook] instagram event without sender/mid, skipped");
        continue;
      }

      const timestamp = typeof event.timestamp === "number" ? event.timestamp : Date.now();
      const firstAttachment = message.attachments?.[0];
      let mediaUrl: string | null = null;
      let type: MessageType = "text";
      let text = message.text ?? null;

      if (firstAttachment) {
        type = mapType(firstAttachment.type);
        mediaUrl = firstAttachment.payload?.url ?? null;
        if (!text) text = firstAttachment.title ?? firstAttachment.payload?.title ?? null;
      } else if (message.text === undefined) {
        type = "other";
      }

      try {
        const inserted = await recordInbound({
          userId: tenant.userId,
          channel: "instagram",
          accountId: entry?.id,
          externalId: mid,
          senderExternalId: senderId,
          senderName: null,
          senderAvatarUrl: null,
          text: text || placeholder(type),
          mediaUrl,
          type,
          createdAt: new Date(timestamp),
        });
        if (inserted) console.log(`[webhook] instagram inbound ${mid} (${type})`);
        else console.log(`[webhook] instagram duplicate ${mid}, ignored`);
      } catch (error) {
        console.error("[webhook] failed to store instagram message:", error);
      }
    }
  }
}
