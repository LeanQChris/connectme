import { config, graphUrl } from "../config";
import { postGraphJson } from "../meta/client";
import type { ChannelAdapter, SendResult } from "./types";

interface WhatsAppSendResponse {
  messages?: Array<{ id?: string }>;
}

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",

  isConfigured() {
    return Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);
  },

  async sendText({ contact, text }): Promise<SendResult> {
    const payload = (await postGraphJson(
      graphUrl(`${config.waPhoneNumberId}/messages`),
      config.waAccessToken,
      {
        messaging_product: "whatsapp",
        to: contact.externalId,
        type: "text",
        text: { body: text },
      },
    )) as WhatsAppSendResponse;

    return { externalId: payload?.messages?.[0]?.id ?? null };
  },
};