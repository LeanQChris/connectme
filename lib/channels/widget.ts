import { enqueueWidgetMessage } from "../store";
import type { ChannelAdapter, SendResult } from "./types";

/**
 * The website chat widget.
 *
 * Delivery is pull-based: a reply is queued in the visitor's browser and handed
 * over on their next poll, so "sent" means "waiting on the page", not "read".
 * One visitor session is one contact, so `contact.externalId` is the session id.
 */
export const widgetAdapter: ChannelAdapter = {
  channel: "widget",

  isConfigured() {
    // No credentials: the embed id in the script tag is the whole setup.
    return true;
  },

  async sendText({ tenant, contact, text }): Promise<SendResult> {
    const externalId = await enqueueWidgetMessage({
      userId: tenant.userId,
      sid: contact.externalId,
      text,
      type: "text",
    });
    return { externalId };
  },

  async sendMedia({ tenant, contact, mediaUrl, type, text }): Promise<SendResult> {
    const externalId = await enqueueWidgetMessage({
      userId: tenant.userId,
      sid: contact.externalId,
      text: text || null,
      mediaUrl,
      type,
    });
    return { externalId };
  },
};