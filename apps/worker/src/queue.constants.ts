export const OUTBOUND_SCHEDULER_QUEUE = "outbound-scheduler";

export interface ScheduledJobData {
  kind: "post" | "message";
  id: string;
  tenantId: string;
}
