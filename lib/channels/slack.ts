import { ChannelNotConfiguredError } from "../meta/client";
import { fetchAttachmentBytes } from "../attachments";
import { sendSlackFiles, sendSlackMessage } from "../slack/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

export const slackAdapter: ChannelAdapter = {
  channel: "slack",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.slackBotToken);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    if (!tenant.slackBotToken) {
      throw new ChannelNotConfiguredError(
        "Slack is not connected. Add your bot token in Settings.",
      );
    }

    const { messageId } = await sendSlackMessage(
      tenant.slackBotToken,
      contact.externalId,
      text,
    );
    return { externalId: messageId };
  },

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    const token = tenant.slackBotToken;
    if (!token) {
      throw new ChannelNotConfiguredError(
        "Slack is not connected. Add your bot token in Settings.",
      );
    }

    const files = await Promise.all(media.map((item) => fetchAttachmentBytes(item)));
    const { messageId } = await sendSlackFiles(token, contact.externalId, text, files);
    return [{ externalId: messageId }];
  },
};