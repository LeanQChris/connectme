import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { InboxRealtimeGateway } from "../../presentation/gateways/inbox-realtime.gateway";
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

  constructor(private readonly gateway: InboxRealtimeGateway) {}

  onModuleInit(): void {
    const url =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;
    try {
      this.subscriber = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      this.subscriber.on("error", () => undefined);
      this.subscriber.on("message", (_channel, message) => this.handle(message));
      this.subscriber
        .connect()
        .then(() => this.subscriber?.subscribe(REALTIME_CHANNEL))
        .catch(() => {
          this.logger.warn("Realtime bridge disabled (Redis unavailable).");
          this.subscriber = null;
        });
    } catch {
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
