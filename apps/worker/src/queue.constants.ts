export const OUTBOUND_SCHEDULER_QUEUE = "outbound-scheduler";
export const INBOUND_WEBHOOKS_QUEUE = "inbound-webhooks";
export const AI_AGENT_QUEUE = "ai-agent";
export const MEDIA_REHOST_QUEUE = "media-rehost";
export const OUTBOUND_RETRY_QUEUE = "outbound-retry";

export interface ScheduledJobData {
  kind: "post" | "message";
  id: string;
  tenantId: string;
}

/**
 * Enqueued by the inbound processor after a message is persisted. The AI agent
 * decides whether to auto-reply (tenant opt-in) or simply stage a draft.
 */
export interface AiAgentJobData {
  tenantId: string;
  conversationId: string;
  messageId: string;
}

/**
 * Enqueued by the inbound processor for inbound media. `mediaId` is the
 * provider-side handle (e.g. WhatsApp media id); `mediaUrl` is a direct CDN URL
 * (Messenger/Instagram attachments). The processor downloads, re-hosts to S3,
 * and rewrites the stored `mediaUrl`.
 */
export interface MediaRehostJobData {
  tenantId: string;
  messageId: string;
  channel: string;
  mediaId?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
}

/**
 * Enqueued by the API when an immediate (non-scheduled) outbound send fails
 * with a retryable error, so the worker can retry with backoff.
 */
export interface OutboundRetryJobData {
  tenantId: string;
  conversationId: string;
  messageId: string;
  attempt: number;
}
