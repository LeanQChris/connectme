import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { ConversationStatus } from "@connectme/database";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { UpdateConversationDto } from "@connectme/contracts";
import { InboxRealtimeGateway } from "../../../presentation/gateways/inbox-realtime.gateway";

@Injectable()
export class UpdateConversationUseCase {
  constructor(
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    private readonly realtimeGateway: InboxRealtimeGateway,
  ) {}

  async execute(tenantId: string, conversationId: string, dto: UpdateConversationDto) {
    const conv = await this.convRepo.findById(tenantId, conversationId);
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }

    if (dto.status) {
      const dbStatus = dto.status.toUpperCase() as ConversationStatus;
      await this.convRepo.updateStatus(tenantId, conversationId, dbStatus);
    }

    if (dto.assignee !== undefined) {
      await this.convRepo.setAssignee(tenantId, conversationId, dto.assignee);
    }

    if (dto.tags) {
      await this.convRepo.setTags(tenantId, conversationId, dto.tags);
    }

    const updated = await this.convRepo.findById(tenantId, conversationId);
    this.realtimeGateway.broadcastConversationUpdate(tenantId, updated);
    return updated;
  }
}
