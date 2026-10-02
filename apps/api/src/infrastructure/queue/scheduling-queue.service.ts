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
      await Promise.race([
        this.queue.waitUntilReady(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis connection timed out")), READY_TIMEOUT_MS),
        ),
      ]);
      this.ready = true;
      this.logger.log(`Queue "${OUTBOUND_SCHEDULER_QUEUE}" ready.`);
    } catch (err: any) {
      this.ready = false;
      this.logger.error(
        `Queue "${OUTBOUND_SCHEDULER_QUEUE}" unavailable (${err?.message}). Scheduling is disabled until Redis is reachable.`,
      );
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  private assertReady(): void {
    if (!this.ready) {
      throw new ServiceUnavailableException(
        "Scheduling is temporarily unavailable: the job queue (Redis) is not connected.",
      );
    }
  }

  async enqueue(data: ScheduledJobData, fireAt: Date): Promise<void> {
    this.assertReady();
    const delay = Math.max(fireAt.getTime() - Date.now(), 1000);
    await this.queue.add(data.kind, data, {
      jobId: data.id,
      delay,
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    });
  }

  async remove(jobId: string): Promise<void> {
    if (!this.ready) return;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove().catch(() => undefined);
    }
  }
}
