import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, Inject } from "@nestjs/common";
import { ClerkTokenVerifier } from "../auth/clerk-token-verifier.service";
import { IConversationRepository } from "../../domain/repositories/i-conversation.repository";

function socketOrigins(): string[] | boolean {
  const configured = (process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") configured.push("http://localhost:3000");
  const unique = Array.from(new Set(configured));
  return unique.length ? unique : false;
}

@WebSocketGateway({
  cors: {
    origin: socketOrigins(),
    credentials: true,
  },
})
export class InboxRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(InboxRealtimeGateway.name);

  constructor(
    private readonly verifier: ClerkTokenVerifier,
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (typeof token !== "string" || !token) {
      this.disconnect(client, "Missing session token");
      return;
    }

    try {
      const session = await this.verifier.verify(token);
      client.data.tenantId = session.sub;
      client.join(`tenant:${session.sub}`);
      this.logger.debug(`Client ${client.id} authenticated for tenant ${session.sub}`);
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

  broadcastNewMessage(tenantId: string, conversationId: string, message: unknown) {
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
