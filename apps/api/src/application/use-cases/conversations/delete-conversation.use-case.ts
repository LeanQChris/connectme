import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { InboxRealtimeGateway } from "../../../presentation/gateways/inbox-realtime.gateway";

@Injectable()
export class DeleteConversationUseCase {
  constructor(
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    private readonly realtimeGateway: InboxRealtimeGateway,
  ) {}

  async execute(tenantId: string, conversationId: string): Promise<{ success: boolean; id: string }> {
    const conv = await this.convRepo.findById(tenantId, conversationId);
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }

    const deleted = await this.convRepo.delete(tenantId, conversationId);
    if (deleted) {
      // Broadcast delete event to connected tenant clients
      this.realtimeGateway.server.to(`tenant:${tenantId}`).emit("conversation:deleted", {
        id: conversationId,
      });
    }

    return { success: deleted, id: conversationId };
  }
}
