import { config, graphUrl } from "../config";
import { postGraphJson } from "../meta/client";
import { ChannelNotConfiguredError } from "../meta/client";
import type { ChannelAdapter, SendResult } from "./types";

interface MessengerSendResponse {
  message_id?: string;
}

export const messengerAdapter: ChannelAdapter = {
  channel: "messenger",

  isConfigured() {
    return Boolean(config.fbPageAccessToken);
  },

  async sendText({ contact, text }): Promise<SendResult> {
    const accessToken = config.fbPageAccessToken;
    if (!accessToken) {
      throw new ChannelNotConfiguredError(
        "Messenger is not configured. Set FB_PAGE_ACCESS_TOKEN to enable replies on this channel.",
      );
    }

    const payload = (await postGraphJson(graphUrl("me/messages"), accessToken, {
      recipient: { id: contact.externalId },
      messaging_type: "RESPONSE",
      message: { text },
    })) as MessengerSendResponse;

    return { externalId: payload?.message_id ?? null };
  },

  async sendMedia({ contact, mediaUrl, type, text }): Promise<SendResult> {
    const accessToken = config.fbPageAccessToken;
    if (!accessToken) {
      throw new ChannelNotConfiguredError("Messenger is not configured.");
    }

    const attachmentType =
      type === "image" ? "image" : type === "audio" ? "audio" : type === "video" ? "video" : "file";

    const payload = (await postGraphJson(graphUrl("me/messages"), accessToken, {
      recipient: { id: contact.externalId },
      messaging_type: "RESPONSE",
      message: {
        attachment: {
          type: attachmentType,
          payload: { url: mediaUrl, is_reusable: true },
        },
        ...(text ? { text } : {}),
      },
    })) as MessengerSendResponse;

    return { externalId: payload?.message_id ?? null };
  },
};