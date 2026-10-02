import { ChannelNotConfiguredError } from "../meta/client";
import { sendDiscordAttachment, sendDiscordMessage } from "../discord/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

export const discordAdapter: ChannelAdapter = {
  channel: "discord",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.discordBotToken);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    if (!tenant.discordBotToken) {
      throw new ChannelNotConfiguredError(
        "Discord is not connected. Add your bot token in Settings.",
      );
    }

    const { messageId } = await sendDiscordMessage(
      tenant.discordBotToken,
      contact.externalId,
      text,
    );
    return { externalId: messageId };
  },

  async sendMedia({ tenant, contact, mediaUrl, type, text }): Promise<SendResult> {
    if (!tenant.discordBotToken) {
      throw new ChannelNotConfiguredError(
        "Discord is not connected. Add your bot token in Settings.",
      );
    }

    const { messageId } = await sendDiscordAttachment(
      tenant.discordBotToken,
      contact.externalId,
      mediaUrl,
      type,
      text || undefined,
    );
    return { externalId: messageId };
  },
};
