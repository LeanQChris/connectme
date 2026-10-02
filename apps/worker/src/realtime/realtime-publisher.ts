import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

export const REALTIME_CHANNEL = "connectme:realtime";

export interface RealtimeEvent {
  type: "message:new" | "conversation:update" | "message:status" | "scheduled:update";
  tenantId: string;
  payload: Record<string, unknown>;
}

/**
 * Publishes realtime events onto Redis so the API's websocket gateway can
 * broadcast them to connected clients. No-op (with a warning) if Redis is down.
 */
@Injectable()
export class RealtimePublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisher.name);
  private client: Redis | null = null;

  constructor() {
    const url =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;
    try {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      this.client.connect().catch(() => {
        this.client = null;
      });
    } catch {
      this.client = null;
    }
  }

  async publish(event: RealtimeEvent): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.publish(REALTIME_CHANNEL, JSON.stringify(event));
    } catch {
      // best-effort; realtime is non-critical
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
