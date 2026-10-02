import { Injectable, Inject } from "@nestjs/common";
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
import { DiscordInteractionPayload } from "@connectme/contracts";

@Injectable()
export class ProcessInboundDiscordUseCase {
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

  async execute(interaction: DiscordInteractionPayload) {
    if (!interaction?.id) return;

    const lockKey = `discord:${interaction.id}`;
    const acquired = await this.idempotency.acquire(lockKey);
    if (!acquired) return; // Deduplicated

    const account = interaction.application_id
      ? await this.tenantRepo.findAccountByExternalId(ChannelType.DISCORD, interaction.application_id)
      : null;
    let tenantId = account?.tenantId;
    if (!tenantId) {
      const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant(
        "system",
        "admin@connectme.local",
      );
      tenantId = defaultTenant.id;
    }

    const channelId = interaction.channel_id || "general";
    const user = interaction.member?.user || interaction.user;
    const senderName = user?.username || "Discord User";
    const externalId = channelId;

    const contact = await this.contactRepo.upsertContact(
      tenantId,
      ChannelType.DISCORD,
      externalId,
      { name: senderName },
    );

    const conv = await this.convRepo.findOrCreateForContact(
      tenantId,
      contact.id,
      ChannelType.DISCORD,
    );

    const commandName = interaction.data?.name || "interaction";
    const text = `/${commandName}`;

    const msg = await this.messageRepo.createMessage({
      conversationId: conv.id,
      externalId: interaction.id,
      direction: MessageDirection.INBOUND,
      channel: ChannelType.DISCORD,
      type: MediaType.TEXT,
      text,
      status: MessageStatus.RECEIVED,
    });

    await this.convRepo.updateLastMessage(tenantId, conv.id, text, true);
    this.realtimeGateway.broadcastNewMessage(tenantId, conv.id, msg);
  }
}
