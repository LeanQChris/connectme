import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BrowserPushSubscription, MessageDirection } from "@connectme/database";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { buildRedisOptions, resolveRedisUrl } from "../redis/redis-options";

export const REALTIME_CHANNEL = "connectme:realtime";

export interface RealtimeEvent {
  type: "message:new" | "conversation:update" | "message:status" | "scheduled:update";
  tenantId: string;
  payload: Record<string, unknown>;
}

/**
 * Publishes realtime events onto Redis so the API's websocket gateway can
 * broadcast them to connected clients. Best-effort: skips (with a warning) if
 * Redis is down; reconnects automatically when it returns.
 */
@Injectable()
export class RealtimePublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisher.name);
  private readonly client: Redis;

  constructor(
    @InjectRepository(BrowserPushSubscription) private readonly subscriptions: Repository<BrowserPushSubscription>,
    @InjectQueue("browser-push") private readonly pushQueue: Queue,
  ) {
    this.client = new Redis(resolveRedisUrl(), buildRedisOptions());
    // Required: an unhandled "error" event would crash the process.
    this.client.on("error", (err) => {
      this.logger.warn(`Realtime publisher Redis error: ${err.message}`);
    });
    this.client.connect().catch((err) => {
      this.logger.warn(`Realtime publisher offline until Redis returns: ${err?.message}`);
    });
  }

  async publish(event: RealtimeEvent): Promise<void> {
    const message = event.payload.message as { id?: string; direction?: string } | undefined;
    if (event.type === "message:new" && message?.id && message.direction === MessageDirection.INBOUND && process.env.VAPID_PUBLIC_KEY) {
      try {
        const subscriptions = await this.subscriptions.find({ where: { tenantId: event.tenantId } });
        await this.pushQueue.addBulk(subscriptions.map((s) => ({ name: "deliver",
          data: { tenantId: event.tenantId, subscriptionId: s.id, messageId: message.id },
          opts: { jobId: `push-${message.id}-${s.id}`, attempts: 4, backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { age: 86400, count: 10000 }, removeOnFail: { age: 604800, count: 1000 } },
        })));
      } catch { this.logger.warn("Could not queue background browser alerts."); }
    }

    try {
      await this.client.publish(REALTIME_CHANNEL, JSON.stringify(event));
    } catch (err: any) {
      this.logger.warn(`Realtime publish skipped: ${err?.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
