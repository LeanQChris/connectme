import { ChannelNotConfiguredError } from "../meta/client";
import { fetchAttachmentBytes } from "../attachments";
import { sendDiscordFiles, sendDiscordMessage } from "../discord/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

/** Discord caps a single message at 10 files. */
const MAX_FILES = 10;

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

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    if (!tenant.discordBotToken) {
      throw new ChannelNotConfiguredError(
        "Discord is not connected. Add your bot token in Settings.",
      );
    }

    // Every attachment is uploaded as a real file, not linked, so all kinds look
    // the same on the Discord side.
    const files = await Promise.all(
      media.slice(0, MAX_FILES).map((item) => fetchAttachmentBytes(item)),
    );

    const { messageId } = await sendDiscordFiles(
      tenant.discordBotToken,
      contact.externalId,
      text,
      files,
    );
    return [{ externalId: messageId }];
  },
};