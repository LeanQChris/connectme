import { z } from "zod";

// Push endpoints are server-side HTTP destinations, so never accept arbitrary URLs.
export function isBrowserPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && (
      ["fcm.googleapis.com", "push.services.mozilla.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname) ||
      url.hostname.endsWith(".push.apple.com") || url.hostname.endsWith(".notify.windows.com")
    );
  } catch { return false; }
}
export const BrowserPushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(isBrowserPushEndpoint, "Unsupported browser push endpoint"),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}={0,1}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }).strict(),
}).strict();
export type BrowserPushSubscriptionDto = z.infer<typeof BrowserPushSubscriptionSchema>;
