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

  async sendMedia({ tenant, contact, media, text }): Promise<SendResult[]> {
    const results: SendResult[] = [];

    // The widget has no burst concept: every attachment is its own queued item so
    // the browser renders them in order.
    if (media.length === 0) {
      const externalId = await enqueueWidgetMessage({
        userId: tenant.userId,
        sid: contact.externalId,
        text: text || null,
        type: "text",
      });
      return [{ externalId }];
    }

    for (const item of media) {
      const externalId = await enqueueWidgetMessage({
        userId: tenant.userId,
        sid: contact.externalId,
        text: text || null,
        media: [item],
        type: item.type,
      });
      text = "";
      results.push({ externalId });
    }

    return results;
  },
};