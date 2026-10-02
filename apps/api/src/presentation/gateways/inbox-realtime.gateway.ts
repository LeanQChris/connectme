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
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class InboxRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(InboxRealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join:tenant")
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    if (data?.tenantId) {
      client.join(`tenant:${data.tenantId}`);
      this.logger.debug(`Client ${client.id} joined room tenant:${data.tenantId}`);
    }
  }

  @SubscribeMessage("join:conversation")
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.join(`conv:${data.conversationId}`);
    }
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
}
