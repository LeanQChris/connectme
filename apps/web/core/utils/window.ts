import type { ReplyWindow } from "../types";

/** Free-form replies are only allowed for 24h after the last inbound message. */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Computes the state of the 24-hour free-form reply window.
 * A conversation with no inbound message at all counts as open.
 */
export function replyWindow(lastInboundAt: string | null, now = Date.now()): ReplyWindow {
  if (!lastInboundAt) return { open: true, msRemaining: null };
  const msRemaining = REPLY_WINDOW_MS - (now - new Date(lastInboundAt).getTime());
  return { open: msRemaining > 0, msRemaining: msRemaining > 0 ? msRemaining : 0 };
}
