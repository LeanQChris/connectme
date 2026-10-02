import { config, graphUrl } from "../config";
import { ChannelNotConfiguredError, MetaSendError, postGraphJson } from "../meta/client";
import type { ChannelAdapter, SendResult } from "./types";

interface WhatsAppSendResponse {
  messages?: Array<{ id?: string }>;
}

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",

  isConfigured() {
    return Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);
  },

  async sendText({ contact, text }): Promise<SendResult> {
    const payload = (await postGraphJson(
      graphUrl(`${config.waPhoneNumberId}/messages`),
      config.waAccessToken,
      {
        messaging_product: "whatsapp",
        to: contact.externalId,
        type: "text",
        text: { body: text },
      },
    )) as WhatsAppSendResponse;

    return { externalId: payload?.messages?.[0]?.id ?? null };
  },

  async sendMedia({ contact, mediaUrl, mimeType, type, text }): Promise<SendResult> {
    const mediaId = await uploadMedia(mediaUrl, mimeType);
    const payload = (await postGraphJson(
      graphUrl(`${config.waPhoneNumberId}/messages`),
      config.waAccessToken,
      {
        messaging_product: "whatsapp",
        to: contact.externalId,
        type,
        [type]: { id: mediaId, ...(text ? { caption: text } : {}) },
      },
    )) as WhatsAppSendResponse;

    return { externalId: payload?.messages?.[0]?.id ?? null };
  },
};

/**
 * WhatsApp needs the bytes first: the resumable upload endpoint returns a media
 * id that /messages can then reference.
 */
async function uploadMedia(mediaUrl: string, mimeType: string): Promise<string> {
  const appId = process.env.META_APP_ID?.trim();
  if (!appId) {
    throw new ChannelNotConfiguredError(
      "Attachments on WhatsApp need META_APP_ID for the resumable upload step.",
    );
  }

  const response = await fetch(`https://upload.facebook.com/${config.graphVersion}/${appId}/uploads`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.waAccessToken}`,
      "file_offset": "0",
      "content-type": mimeType,
    },
    body: Buffer.from(await (await fetch(mediaUrl)).arrayBuffer()),
  });

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!response.ok || !payload?.id) {
    throw new MetaSendError("WhatsApp media upload failed", response.status);
  }
  return payload.id;
}