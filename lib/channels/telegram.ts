import {
  sendTelegramAttachment,
  sendTelegramMediaGroup,
  sendTelegramMessage,
} from "../telegram/client";
import { ChannelNotConfiguredError } from "../meta/client";
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

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    const token = tenant.telegramBotToken;
    if (!token) {
      throw new ChannelNotConfiguredError(
        "Telegram is not connected. Add your bot token in Settings.",
      );
    }

    // Telegram shows 2-10 same-kind items as a single album; anything else goes
    // out as its own message.
    const albumable = media.filter((m) => m.type !== "sticker");
    const sameKind = albumable.every((m) => m.type === albumable[0].type);
    if (albumable.length > 1 && sameKind) {
      try {
        const { messageId } = await sendTelegramMediaGroup(
          token,
          contact.externalId,
          albumable.map((m) => ({ type: m.type as "image" | "video" | "document", url: m.url })),
          text || undefined,
        );
        const stickers = media.filter((m) => m.type === "sticker");
        const extra = await Promise.all(
          stickers.map((m) =>
            sendTelegramAttachment(token, contact.externalId, m.url, "image", undefined),
          ),
        );
        return [
          { externalId: messageId },
          ...extra.map((e) => ({ externalId: e.messageId })),
        ];
      } catch (error) {
        // Albums are a nicety: fall back to individual sends.
        console.warn("[telegram] album failed, sending individually:", error);
      }
    }

    const results: SendResult[] = [];
    let caption = text;
    for (const item of media) {
      // Telegram only captions the first item of a multi-send.
      const { messageId } = await sendTelegramAttachment(
        token,
        contact.externalId,
        item.url,
        item.type === "sticker" ? "image" : item.type,
        caption || undefined,
      );
      caption = "";
      results.push({ externalId: messageId });
    }
    return results;
  },
};