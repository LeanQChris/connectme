import { sendEmail } from "../email/client";
import { ChannelNotConfiguredError } from "../meta/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

export const emailAdapter: ChannelAdapter = {
  channel: "email",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.emailApiKey && tenant.emailFrom);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    if (!tenant.emailApiKey || !tenant.emailFrom) {
      throw new ChannelNotConfiguredError("Email is not connected. Add credentials in Settings.");
    }
    const { messageId } = await sendEmail(tenant.emailApiKey, tenant.emailFrom, contact.externalId, "New message", text);
    return { externalId: messageId };
  },

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    if (!tenant.emailApiKey || !tenant.emailFrom) {
      throw new ChannelNotConfiguredError("Email is not connected. Add credentials in Settings.");
    }
    const { messageId } = await sendEmail(
      tenant.emailApiKey,
      tenant.emailFrom,
      contact.externalId,
      "New message",
      text || "(attachment)",
      media.map((m) => ({ url: m.url, name: m.name })),
    );
    return [{ externalId: messageId }];
  },
};
