import { graphUrl } from "../config";
import { ChannelNotConfiguredError, MetaSendError, postGraphJson } from "../meta/client";
import { fetchAttachmentBytes } from "../attachments";
import type { ChannelAdapter, OutboundMedia, SendResult, Tenant } from "./types";

interface WhatsAppSendResponse {
  messages?: Array<{ id?: string }>;
}

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.waPhoneNumberId && tenant.waAccessToken);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    const payload = (await postGraphJson(
      graphUrl(tenant.graphVersion, `${tenant.waPhoneNumberId}/messages`),
      tenant.waAccessToken,
      {
        messaging_product: "whatsapp",
        to: contact.externalId,
        type: "text",
        text: { body: text },
      },
    )) as WhatsAppSendResponse;

    return { externalId: payload?.messages?.[0]?.id ?? null };
  },

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    // WhatsApp takes one attachment per message, so a multi-attachment reply
    // becomes a short burst. Only the first carries the caption.
    const results: SendResult[] = [];
    let caption = text;

    for (const item of media) {
      const mediaId = await uploadMedia(tenant, item);
      const payload = (await postGraphJson(
        graphUrl(tenant.graphVersion, `${tenant.waPhoneNumberId}/messages`),
        tenant.waAccessToken,
        {
          messaging_product: "whatsapp",
          to: contact.externalId,
          type: item.type,
          [item.type]: { id: mediaId, ...(caption ? { caption } : {}) },
        },
      )) as WhatsAppSendResponse;

      results.push({ externalId: payload?.messages?.[0]?.id ?? null });
      caption = "";
    }

    return results;
  },
};

/**
 * WhatsApp needs the bytes first: the resumable upload endpoint returns a media
 * id that /messages can then reference.
 */
async function uploadMedia(tenant: Tenant, media: OutboundMedia): Promise<string> {
  const appId = tenant.waAppId.trim();
  if (!appId) {
    throw new ChannelNotConfiguredError(
      "Attachments on WhatsApp need the Meta App id in Settings.",
    );
  }

  const attachment = await fetchAttachmentBytes(media);

  const response = await fetch(
    `https://upload.facebook.com/${tenant.graphVersion}/${appId}/uploads`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${tenant.waAccessToken}`,
        file_offset: "0",
        "content-type": media.mimeType,
        file_name: attachment.filename,
      },
      body: new Blob([attachment.bytes as BlobPart]),
    },
  );

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!response.ok || !payload?.id) {
    throw new MetaSendError("WhatsApp media upload failed", response.status);
  }
  return payload.id;
}