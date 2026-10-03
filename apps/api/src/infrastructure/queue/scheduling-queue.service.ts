import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export const OUTBOUND_SCHEDULER_QUEUE = "outbound-scheduler";

export interface ScheduledJobData {
  kind: "post" | "message";
  id: string;
  tenantId: string;
}

const READY_TIMEOUT_MS = 5000;
const RETRY_READY_TIMEOUT_MS = 2000;

/**
 * BullMQ producer for time-delayed outbound work. Job id is the scheduled
 * item's id so redelivery is idempotent (jobId uniqueness in the queue).
 *
 * Scheduling requires a live Redis connection. If Redis is unavailable we do
 * not fall back to memory (delayed jobs would be lost); instead scheduling is
 * disabled and enqueue attempts return 503.
 */
@Injectable()
export class SchedulingQueueService implements OnModuleInit {
  private readonly logger = new Logger(SchedulingQueueService.name);
  private ready = false;

  constructor(
    @InjectQueue(OUTBOUND_SCHEDULER_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.waitUntilReady(READY_TIMEOUT_MS);
      this.ready = true;
      this.logger.log(`Queue "${OUTBOUND_SCHEDULER_QUEUE}" ready.`);
    } catch (err: any) {
      this.ready = false;
      this.logger.error(
        `Queue "${OUTBOUND_SCHEDULER_QUEUE}" unavailable (${err?.message}). Scheduling is disabled until Redis is reachable.`,
      );
    }
  }

  private async waitUntilReady(timeoutMs: number): Promise<void> {
    await Promise.race([
      this.queue.waitUntilReady(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timed out")), timeoutMs),
      ),
    ]);
  }

  /**
   * Re-probe the connection when it was down at boot so the producer recovers
   * from a Redis restart instead of staying disabled for the process lifetime.
   */
  private async assertReady(): Promise<void> {
    if (!this.ready) {
      try {
        await this.waitUntilReady(RETRY_READY_TIMEOUT_MS);
        this.ready = true;
        this.logger.log(`Queue "${OUTBOUND_SCHEDULER_QUEUE}" reconnected.`);
      } catch {
        throw new ServiceUnavailableException(
          "Scheduling is temporarily unavailable: the job queue (Redis) is not connected.",
        );
      }
    }
  }

  async enqueue(data: ScheduledJobData, fireAt: Date): Promise<void> {
    await this.assertReady();
    const delay = Math.max(fireAt.getTime() - Date.now(), 1000);
    try {
      await this.queue.add(data.kind, data, {
        jobId: data.id,
        delay,
        attempts: 8,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: true,
      });
    } catch (err: any) {
      // A stale ready flag after a Redis restart must not surface as a 500.
      this.ready = false;
      this.logger.error(`Failed to enqueue job ${data.id}: ${err?.message}`);
      throw new ServiceUnavailableException(
        "Scheduling is temporarily unavailable: the job queue (Redis) is not connected.",
      );
    }
  }

  async remove(jobId: string): Promise<void> {
    if (!this.ready) return;
    const job = await this.queue.getJob(jobId);
    if (job) {
      try {
        await job.remove();
      } catch (err: any) {
        this.logger.warn(`Could not remove job ${jobId} (may be active): ${err?.message}`);
      }
    }
  }
}
