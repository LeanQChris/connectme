import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { InboxRealtimeGateway } from "../../presentation/gateways/inbox-realtime.gateway";
import { RedisService } from "../redis/redis.service";
import { REALTIME_CHANNEL } from "./realtime.constants";

interface BridgeEvent {
  type: string;
  tenantId: string;
  payload: Record<string, any>;
}

/**
 * Subscribes to the worker's Redis pub/sub channel and forwards events to the
 * websocket gateway. This bridges the worker process (no socket server) to the
 * API process (owns the socket server).
 */
@Injectable()
export class RealtimeBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeBridgeService.name);
  private subscriber: Redis | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: InboxRealtimeGateway,
  ) {}

  onModuleInit(): void {
    try {
      // A dedicated connection is required: a client in subscriber mode cannot
      // run normal commands. `duplicate()` reuses the shared client's options.
      const subscriber = this.redis.duplicate();
      this.subscriber = subscriber;
      subscriber.on("error", (err) => {
        this.logger.warn(`Realtime bridge Redis error: ${err.message}`);
      });
      subscriber.on("message", (_channel, message) => this.handle(message));
      subscriber.on("ready", () => {
        subscriber.subscribe(REALTIME_CHANNEL).catch((err) => {
          this.logger.warn(`Realtime bridge subscribe failed: ${err?.message}`);
        });
      });
      subscriber.connect().catch((err) => {
        this.logger.warn(`Realtime bridge disabled until Redis returns: ${err?.message}`);
      });
    } catch (err: any) {
      this.logger.warn(`Realtime bridge disabled (${err?.message}).`);
      this.subscriber = null;
    }
  }

  private handle(raw: string): void {
    let event: BridgeEvent;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (!event?.tenantId) return;

    switch (event.type) {
      case "message:new":
        this.gateway.broadcastNewMessage(
          event.tenantId,
          event.payload.conversationId,
          event.payload.message,
        );
        break;
      case "conversation:update":
        this.gateway.broadcastConversationUpdate(event.tenantId, event.payload.conversation);
        break;
      case "message:status":
        this.gateway.broadcastMessageStatus(
          event.tenantId,
          event.payload.messageId,
          event.payload.status,
          event.payload.externalId,
        );
        break;
      case "scheduled:update":
        this.gateway.broadcastScheduledUpdate(event.tenantId, event.payload.item);
        break;
      default:
        break;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit().catch(() => undefined);
    }
  }
}
