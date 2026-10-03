import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
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

  constructor() {
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
