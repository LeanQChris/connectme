import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BrowserPushSubscription, MessageDirection } from "@connectme/database";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Logger, Inject, OnModuleInit } from "@nestjs/common";
import { ClerkTokenVerifier } from "../auth/clerk-token-verifier.service";
import { IConversationRepository } from "../../domain/repositories/i-conversation.repository";
import { TenantMembershipService } from "../auth/tenant-membership.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

function socketOrigins(): string[] | boolean {
  const configured = (process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") configured.push("http://localhost:3001");
  const unique = Array.from(new Set(configured));
  return unique.length ? unique : false;
}

@WebSocketGateway({
  cors: {
    origin: socketOrigins(),
    credentials: true,
  },
})
export class InboxRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(InboxRealtimeGateway.name);

  constructor(
    private readonly verifier: ClerkTokenVerifier,
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    private readonly membership: TenantMembershipService,
    private readonly redis: RedisService,
    @InjectRepository(BrowserPushSubscription) private readonly subscriptions: Repository<BrowserPushSubscription>,
    @InjectQueue("browser-push") private readonly pushQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Attach the Redis adapter so rooms/fan-out span every API replica. If
    // Redis is unavailable the gateway still works single-instance.
    try {
      const pubClient = this.redis.duplicateForAdapter();
      const subClient = this.redis.duplicateForAdapter();
      this.server.adapter(createAdapter(pubClient, subClient));
      this.logger.log("Realtime gateway using Redis socket.io adapter.");
    } catch (err: any) {
      this.logger.warn(`Socket.io Redis adapter disabled (${err?.message}).`);
    }
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (typeof token !== "string" || !token) {
      this.disconnect(client, "Missing session token");
      return;
    }

    try {
      const session = await this.verifier.verify(token);
      const member = await this.membership.resolve(session.sub);
      client.data.tenantId = member.tenantId;
      client.data.userId = member.id;
      await client.join([`tenant:${member.tenantId}`, `user:${member.id}`]);
      // Verify again after joining to close the race with a concurrent removal.
      await this.membership.resolve(session.sub);
      this.logger.debug(`Client ${client.id} authenticated for tenant ${member.tenantId}`);
    } catch {
      this.disconnect(client, "Invalid session token");
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join:tenant")
  handleJoinTenant(@ConnectedSocket() client: Socket) {
    const tenantId = client.data?.tenantId;
    if (tenantId) client.join(`tenant:${tenantId}`);
  }

  @SubscribeMessage("join:conversation")
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const tenantId = client.data?.tenantId;
    if (!tenantId || !data?.conversationId) return;

    const conversation = await this.convRepo.findById(tenantId, data.conversationId);
    if (!conversation) return;

    client.join(`conv:${data.conversationId}`);
  }

  disconnectMember(userId: string) {
    this.server?.in(`user:${userId}`).disconnectSockets(true);
  }

  broadcastNewMessage(tenantId: string, conversationId: string, message: unknown) {
    const inbound = message as { id?: string; direction?: string };
    if (inbound?.id && inbound.direction === MessageDirection.INBOUND && process.env.VAPID_PUBLIC_KEY) {
      // API-originated messages (e.g. widget) also need push. The shared job ID
      // deduplicates worker events forwarded through this gateway.
      void this.subscriptions.find({ where: { tenantId } }).then((subscriptions) => this.pushQueue.addBulk(subscriptions.map((s) => ({
        name: "deliver", data: { tenantId, subscriptionId: s.id, messageId: inbound.id },
        opts: { jobId: `push-${inbound.id}-${s.id}`, attempts: 4, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: { age: 86400, count: 10000 }, removeOnFail: { age: 604800, count: 1000 } },
      })))).catch(() => this.logger.warn("Could not queue background browser alerts."));
    }
    if (!this.server) return;
    this.server.to(`tenant:${tenantId}`).emit("message:new", { conversationId, message });
    this.server.to(`conv:${conversationId}`).emit("message:new", { conversationId, message });
  }

  broadcastConversationUpdate(tenantId: string, conversation: unknown) {
    if (!this.server) return;
    this.server.to(`tenant:${tenantId}`).emit("conversation:update", conversation);
  }

  broadcastMessageStatus(tenantId: string, messageId: string, status: string, externalId?: string) {
    if (!this.server) return;
    this.server.to(`tenant:${tenantId}`).emit("message:status", { messageId, status, externalId });
  }

  broadcastScheduledUpdate(tenantId: string, item: unknown) {
    if (!this.server) return;
    this.server.to(`tenant:${tenantId}`).emit("scheduled:update", item);
  }

  private disconnect(client: Socket, reason: string) {
    this.logger.warn(`Rejecting socket ${client.id}: ${reason}`);
    client.emit("unauthorized", { reason });
    client.disconnect(true);
  }
}
