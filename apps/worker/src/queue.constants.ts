export const OUTBOUND_SCHEDULER_QUEUE = "outbound-scheduler";
export const INBOUND_WEBHOOKS_QUEUE = "inbound-webhooks";

export interface ScheduledJobData {
  kind: "post" | "message";
  id: string;
  tenantId: string;
}
