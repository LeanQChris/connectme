import { config, graphUrl } from "../config";
import { postGraphJson } from "../meta/client";
import { ChannelNotConfiguredError } from "../meta/client";
import type { ChannelAdapter, SendResult } from "./types";

interface InstagramSendResponse {
  message_id?: string;
  recipient_id?: string;
}

export const instagramAdapter: ChannelAdapter = {
  channel: "instagram",

  isConfigured() {
    return Boolean(config.fbPageAccessToken);
  },

  async sendText({ contact, text }): Promise<SendResult> {
    const accessToken = config.fbPageAccessToken;
    if (!accessToken) {
      throw new ChannelNotConfiguredError(
        "Instagram is not configured. Set FB_PAGE_ACCESS_TOKEN to enable replies.",
      );
    }

    const payload = (await postGraphJson(graphUrl("me/messages"), accessToken, {
      recipient: { id: contact.externalId },
      message: { text },
    })) as InstagramSendResponse;

    return { externalId: payload?.message_id ?? null };
  },
};
