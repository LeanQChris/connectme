import { sendViberMessage } from "../viber/client";
import { ChannelNotConfiguredError } from "../meta/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

export const viberAdapter: ChannelAdapter = {
  channel: "viber",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.viberAuthToken);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    if (!tenant.viberAuthToken) {
      throw new ChannelNotConfiguredError("Viber is not connected. Add the auth token in Settings.");
    }
    const { messageId } = await sendViberMessage(tenant.viberAuthToken, contact.externalId, {
      type: "text",
      text,
      sender: { name: "Support" },
    });
    return { externalId: messageId };
  },

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    if (!tenant.viberAuthToken) {
      throw new ChannelNotConfiguredError("Viber is not connected. Add the auth token in Settings.");
    }

    const results: SendResult[] = [];
    let caption = text;
    for (const item of media) {
      const type =
        item.type === "image" ? "picture" : item.type === "video" ? "video" : "file";
      const { messageId } = await sendViberMessage(tenant.viberAuthToken, contact.externalId, {
        type: type as "picture" | "video" | "file",
        media: item.url,
        file_name: item.name ?? undefined,
        text: caption || undefined,
        sender: { name: "Support" },
      });
      caption = "";
      results.push({ externalId: messageId });
    }
    return results;
  },
};
