import { ChannelNotConfiguredError } from "../meta/client";
import { sendSlackAttachment, sendSlackMessage } from "../slack/client";
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

  async sendMedia({ tenant, contact, mediaUrl, type, text }): Promise<SendResult> {
    if (!tenant.slackBotToken) {
      throw new ChannelNotConfiguredError(
        "Slack is not connected. Add your bot token in Settings.",
      );
    }

    const { messageId } = await sendSlackAttachment(
      tenant.slackBotToken,
      contact.externalId,
      mediaUrl,
      type,
      text || undefined,
    );
    return { externalId: messageId };
  },
};
