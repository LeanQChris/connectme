import { ChannelNotConfiguredError } from "../meta/client";
import { sendTelegramAttachment, sendTelegramMessage } from "../telegram/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

export const telegramAdapter: ChannelAdapter = {
  channel: "telegram",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.telegramBotToken);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    if (!tenant.telegramBotToken) {
      throw new ChannelNotConfiguredError(
        "Telegram is not connected. Add your bot token in Settings.",
      );
    }

    const { messageId } = await sendTelegramMessage(
      tenant.telegramBotToken,
      contact.externalId,
      text,
    );
    return { externalId: messageId };
  },

  async sendMedia({ tenant, contact, mediaUrl, type, text }): Promise<SendResult> {
    const { messageId } = await sendTelegramAttachment(
      tenant.telegramBotToken,
      contact.externalId,
      mediaUrl,
      type,
      text || undefined,
    );
    return { externalId: messageId };
  },
};
