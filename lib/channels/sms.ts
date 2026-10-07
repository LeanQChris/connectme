import { sendSms } from "../sms/client";
import { ChannelNotConfiguredError } from "../meta/client";
import type { ChannelAdapter, SendResult, Tenant } from "./types";

export const smsAdapter: ChannelAdapter = {
  channel: "sms",

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.twilioAccountSid && tenant.twilioAuthToken && tenant.twilioPhoneNumber);
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    if (!tenant.twilioAccountSid || !tenant.twilioAuthToken || !tenant.twilioPhoneNumber) {
      throw new ChannelNotConfiguredError("Twilio SMS is not connected. Add credentials in Settings.");
    }
    const { messageId } = await sendSms(
      tenant.twilioAccountSid,
      tenant.twilioAuthToken,
      tenant.twilioPhoneNumber,
      contact.externalId,
      text,
    );
    return { externalId: messageId };
  },

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    if (!tenant.twilioAccountSid || !tenant.twilioAuthToken || !tenant.twilioPhoneNumber) {
      throw new ChannelNotConfiguredError("Twilio SMS is not connected. Add credentials in Settings.");
    }
    // MMS carries up to 10 media urls on one message; anything over is batched.
    const results: SendResult[] = [];
    let caption = text;
    for (let i = 0; i < media.length; i += 10) {
      const batch = media.slice(i, i + 10);
      const { messageId } = await sendSms(
        tenant.twilioAccountSid,
        tenant.twilioAuthToken,
        tenant.twilioPhoneNumber,
        contact.externalId,
        caption,
        batch.map((m) => m.url),
      );
      caption = "";
      results.push({ externalId: messageId });
    }
    return results;
  },
};
