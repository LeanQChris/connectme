import { graphUrl } from "../config";
import { ChannelNotConfiguredError, MetaSendError, postGraphJson } from "../meta/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

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

  async sendMedia({ tenant, contact, mediaUrl, mimeType, type, text }): Promise<SendResult> {
    const mediaId = await uploadMedia(tenant, mediaUrl, mimeType);
    const payload = (await postGraphJson(
      graphUrl(tenant.graphVersion, `${tenant.waPhoneNumberId}/messages`),
      tenant.waAccessToken,
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
async function uploadMedia(tenant: Tenant, mediaUrl: string, mimeType: string): Promise<string> {
  const appId = tenant.waAppId.trim();
  if (!appId) {
    throw new ChannelNotConfiguredError(
      "Attachments on WhatsApp need the Meta App id in Settings.",
    );
  }

  const response = await fetch(
    `https://upload.facebook.com/${tenant.graphVersion}/${appId}/uploads`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${tenant.waAccessToken}`,
        file_offset: "0",
        "content-type": mimeType,
      },
      body: Buffer.from(await (await fetch(mediaUrl)).arrayBuffer()),
    },
  );

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!response.ok || !payload?.id) {
    throw new MetaSendError("WhatsApp media upload failed", response.status);
  }
  return payload.id;
}