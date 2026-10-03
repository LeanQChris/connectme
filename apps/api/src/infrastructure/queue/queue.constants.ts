export const INBOUND_WEBHOOKS_QUEUE = "inbound-webhooks";
export const OUTBOUND_SCHEDULER_QUEUE = "outbound-scheduler";

export interface InboundMetaJobData {
  payload: unknown;
  receivedAt: number;
}
