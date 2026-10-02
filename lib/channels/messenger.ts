import { graphUrl } from "../config";
import { postGraphJson } from "../meta/client";
import { ChannelNotConfiguredError } from "../meta/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

interface MessengerSendResponse {
  message_id?: string;
}

export const messengerAdapter: ChannelAdapter = {
  channel: "messenger",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.pageAccessToken);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    const accessToken = tenant.pageAccessToken;
    if (!accessToken) {
      throw new ChannelNotConfiguredError(
        "Messenger is not configured. Set FB_PAGE_ACCESS_TOKEN to enable replies on this channel.",
      );
    }

    const payload = (await postGraphJson(
      graphUrl(tenant.graphVersion, "me/messages"),
      accessToken,
      {
        recipient: { id: contact.externalId },
        messaging_type: "RESPONSE",
        message: { text },
      },
    )) as MessengerSendResponse;

    return { externalId: payload?.message_id ?? null };
  },

  async sendMedia({ tenant, contact, mediaUrl, type, text }): Promise<SendResult> {
    const accessToken = tenant.pageAccessToken;
    if (!accessToken) {
      throw new ChannelNotConfiguredError("Messenger is not configured.");
    }

    const attachmentType =
      type === "image" ? "image" : type === "audio" ? "audio" : type === "video" ? "video" : "file";

    const payload = (await postGraphJson(
      graphUrl(tenant.graphVersion, "me/messages"),
      accessToken,
      {
        recipient: { id: contact.externalId },
        messaging_type: "RESPONSE",
        message: {
          attachment: {
            type: attachmentType,
            payload: { url: mediaUrl, is_reusable: true },
          },
          ...(text ? { text } : {}),
        },
      },
    )) as MessengerSendResponse;

    return { externalId: payload?.message_id ?? null };
  },
};