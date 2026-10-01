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

export async function handleWhatsApp(body: WhatsAppWebhookBody): Promise<void> {
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
        const type = mapType(message.type);
        const text = type === "text" ? (message.text?.body ?? "") : placeholder(type);
        try {
          const inserted = await recordInbound({
            channel: "whatsapp",
            externalId: message.id,
            senderExternalId: message.from,
            senderName: names.get(message.from) ?? null,
            text,
            type,
            createdAt: unixSecondsToDate(message.timestamp),
          });
          if (inserted) console.log(`[webhook] whatsapp inbound ${message.id} (${type})`);
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
        if (!next) continue; // deleted / warning have no equivalent here
        try {
          const updated = await updateOutboundStatus(
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

export async function handleMessenger(body: PageWebhookBody): Promise<void> {
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
      const hasAttachment = (message.attachments?.length ?? 0) > 0;
      const type: MessageType = message.text !== undefined ? "text" : "other";

      try {
        const inserted = await recordInbound({
          channel: "messenger",
          externalId: mid,
          senderExternalId: senderId,
          // Messenger does not include the name in the webhook payload.
          senderName: null,
          text: message.text ?? (hasAttachment ? "[attachment]" : ""),
          type,
          createdAt: new Date(timestamp),
        });
        if (inserted) console.log(`[webhook] messenger inbound ${mid}`);
        else console.log(`[webhook] messenger duplicate ${mid}, ignored`);
      } catch (error) {
        console.error("[webhook] failed to store messenger message:", error);
      }
    }
  }
}

/**
 * INSTAGRAM PLACEHOLDER — not implemented yet.
 *
 * To add Instagram DMs:
 *  1. Add lib/channels/instagram.ts implementing ChannelAdapter (same shape as
 *     messenger.ts, POST /{ig-user-id}/messages) and register it in the channel
 *     registry (lib/channels/index.ts).
 *  2. Replace this body with the equivalent of handleMessenger (Instagram
 *     messaging events use the same sender.id / message.mid / message.text
 *     shape, and the same is_echo rule).
 *  3. Add "instagram" to the IG_PAGE_ACCESS_TOKEN entry in lib/config.ts and to
 *     .env.example.
 */
export async function handleInstagram(body: InstagramWebhookBody): Promise<void> {
  const count = body.entry?.reduce((total, entry) => total + (entry?.messaging?.length ?? 0), 0) ?? 0;
  console.log(`[webhook] instagram: ignoring ${count} event(s), not implemented yet`);
}