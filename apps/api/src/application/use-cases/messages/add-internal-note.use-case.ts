import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { MessageDirection, MessageStatus, MediaType } from "@connectme/database";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../../domain/repositories/i-message.repository";
import { InboxRealtimeGateway } from "../../../presentation/gateways/inbox-realtime.gateway";

export interface AddInternalNoteInput {
  tenantId: string;
  conversationId: string;
  text: string;
  author?: string;
}

@Injectable()
export class AddInternalNoteUseCase {
  constructor(
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IMessageRepository")
    private readonly messageRepo: IMessageRepository,
    private readonly realtimeGateway: InboxRealtimeGateway,
  ) {}

  async execute(input: AddInternalNoteInput) {
    const conv = await this.convRepo.findById(input.tenantId, input.conversationId);
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }

    const note = await this.messageRepo.createMessage(input.tenantId, {
      conversationId: conv.id,
      direction: MessageDirection.INTERNAL_NOTE,
      channel: conv.channel,
      type: MediaType.TEXT,
      text: input.text,
      status: MessageStatus.RECEIVED,
      authorName: input.author || "Agent",
    });

    this.realtimeGateway.broadcastNewMessage(input.tenantId, conv.id, note);
    return note;
  }
}
