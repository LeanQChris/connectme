import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  ChannelType,
  MessageDirection,
  MessageStatus,
  MediaType,
} from "@connectme/database";
import { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";
import { IContactRepository } from "../../../domain/repositories/i-contact.repository";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../../domain/repositories/i-message.repository";
import { IdempotencyLockService } from "../../../infrastructure/redis/idempotency-lock.service";
import { InboxRealtimeGateway } from "../../../presentation/gateways/inbox-realtime.gateway";
import { TelegramWebhookUpdate } from "@connectme/contracts";

@Injectable()
export class ProcessInboundTelegramUseCase {
  private readonly logger = new Logger(ProcessInboundTelegramUseCase.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IContactRepository")
    private readonly contactRepo: IContactRepository,
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IMessageRepository")
    private readonly messageRepo: IMessageRepository,
    private readonly idempotency: IdempotencyLockService,
    private readonly realtimeGateway: InboxRealtimeGateway,
  ) {}

  async execute(botId: string, update: TelegramWebhookUpdate) {
    if (!update?.message) return;

    const lockKey = `telegram:${update.update_id}`;
    const acquired = await this.idempotency.acquire(lockKey);
    if (!acquired) return; // Deduplicated

    const account = await this.tenantRepo.findAccountByExternalId(ChannelType.TELEGRAM, botId);
    if (!account?.tenantId) {
      this.logger.warn(`Dropping Telegram webhook for unregistered bot ${botId}.`);
      return;
    }
    const tenantId = account.tenantId;

    const chatId = String(update.message.chat.id);
    const senderName =
      update.message.from?.first_name ||
      update.message.from?.username ||
      `User ${chatId.slice(-4)}`;

    const contact = await this.contactRepo.upsertContact(
      tenantId,
      ChannelType.TELEGRAM,
      chatId,
      { name: senderName },
    );

    const conv = await this.convRepo.findOrCreateForContact(
      tenantId,
      contact.id,
      ChannelType.TELEGRAM,
      account?.id,
    );

    const text = update.message.text || (update.message.photo ? "Photo" : "Attachment");
    const msg = await this.messageRepo.createMessage({
      conversationId: conv.id,
      externalId: String(update.message.message_id),
      direction: MessageDirection.INBOUND,
      channel: ChannelType.TELEGRAM,
      type: update.message.photo ? MediaType.IMAGE : MediaType.TEXT,
      text,
      status: MessageStatus.RECEIVED,
    });

    await this.convRepo.updateLastMessage(tenantId, conv.id, text, true);
    this.realtimeGateway.broadcastNewMessage(tenantId, conv.id, msg);
  }
}
