import { config } from "../config";
import { ChannelNotConfiguredError } from "../meta/client";
import { sendTelegramAttachment, sendTelegramMessage } from "../telegram/client";
import type { ChannelAdapter, SendResult } from "./types";

export const telegramAdapter: ChannelAdapter = {
  channel: "telegram",

  isConfigured() {
    return Boolean(config.telegramBotToken);
  },

  async sendText({ contact, text }): Promise<SendResult> {
    if (!config.telegramBotToken) {
      throw new ChannelNotConfiguredError(
        "Telegram is not configured. Set TELEGRAM_BOT_TOKEN to enable replies.",
      );
    }

    const { messageId } = await sendTelegramMessage(contact.externalId, text);
    return { externalId: messageId };
  },

  async sendMedia({ contact, mediaUrl, type, text }): Promise<SendResult> {
    const { messageId } = await sendTelegramAttachment(
      contact.externalId,
      mediaUrl,
      type,
      text || undefined,
    );
    return { externalId: messageId };
  },
};
