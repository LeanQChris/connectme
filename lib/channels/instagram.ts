import { graphUrl } from "../config";
import { postGraphJson } from "../meta/client";
import { ChannelNotConfiguredError } from "../meta/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

interface InstagramSendResponse {
  message_id?: string;
  recipient_id?: string;
}

export const instagramAdapter: ChannelAdapter = {
  channel: "instagram",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.pageAccessToken);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    const accessToken = tenant.pageAccessToken;
    if (!accessToken) {
      throw new ChannelNotConfiguredError(
        "Instagram is not configured. Set FB_PAGE_ACCESS_TOKEN to enable replies.",
      );
    }

    const payload = (await postGraphJson(
      graphUrl(tenant.graphVersion, "me/messages"),
      accessToken,
      {
        recipient: { id: contact.externalId },
        message: { text },
      },
    )) as InstagramSendResponse;

    return { externalId: payload?.message_id ?? null };
  },

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    const accessToken = tenant.pageAccessToken;
    if (!accessToken) {
      throw new ChannelNotConfiguredError("Instagram is not configured.");
    }

    // Instagram messaging accepts images and audio only — a platform limit, not
    // a choice. Anything else in the batch is skipped rather than failing the
    // whole reply.
    const supported = media.filter((m) => m.type === "image" || m.type === "audio");
    if (supported.length === 0) {
      throw new Error("Instagram only supports image and audio attachments.");
    }

    const results: SendResult[] = [];
    let caption = text;

    for (const item of supported) {
      const payload = (await postGraphJson(
        graphUrl(tenant.graphVersion, "me/messages"),
        accessToken,
        {
          recipient: { id: contact.externalId },
          message: {
            attachment: {
              type: item.type === "audio" ? "AUDIO" : "IMAGE",
              payload: { url: item.url },
            },
            ...(caption ? { text: caption } : {}),
          },
        },
      )) as InstagramSendResponse;

      results.push({ externalId: payload?.message_id ?? null });
      caption = "";
    }

    return results;
  },
};