export const INBOUND_WEBHOOKS_QUEUE = "inbound-webhooks";
export const OUTBOUND_SCHEDULER_QUEUE = "outbound-scheduler";
export const OUTBOUND_RETRY_QUEUE = "outbound-retry";

export interface InboundMetaJobData {
  payload: unknown;
  receivedAt: number;
}
