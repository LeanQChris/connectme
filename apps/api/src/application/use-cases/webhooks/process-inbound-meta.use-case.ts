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
import { MetaWebhookPayload } from "@connectme/contracts";

@Injectable()
export class ProcessInboundMetaUseCase {
  private readonly logger = new Logger(ProcessInboundMetaUseCase.name);

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

  async execute(payload: MetaWebhookPayload) {
    if (!payload?.entry) return;

    for (const entry of payload.entry) {
      // 1. WhatsApp business account
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "messages") {
            await this.handleWhatsAppChange(entry.id, change.value);
          }
        }
      }

      // 2. Facebook Messenger / Instagram Direct messaging entries
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await this.handleMessengerEvent(entry.id, event, payload.object === "instagram");
        }
      }
    }
  }

  private async handleWhatsAppChange(accountId: string, value: any) {
    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) return;

    // Route to connected account or default tenant
    const account = await this.tenantRepo.findAccountByExternalId(ChannelType.WHATSAPP, phoneNumberId);
    let tenantId = account?.tenantId;

    if (!tenantId) {
      const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
      tenantId = defaultTenant.id;
    }

    // 1. Handle delivery/read statuses
    if (value.statuses) {
      for (const status of value.statuses) {
        const statusMap: Record<string, MessageStatus> = {
          sent: MessageStatus.SENT,
          delivered: MessageStatus.DELIVERED,
          read: MessageStatus.READ,
          failed: MessageStatus.FAILED,
        };
        const mapped = statusMap[status.status];
        if (mapped) {
          await this.messageRepo.updateStatusByExternalId(status.id, mapped);
          this.realtimeGateway.broadcastMessageStatus(tenantId, status.id, mapped, status.id);
        }
      }
    }

    // 2. Handle inbound messages
    if (value.messages) {
      for (const msg of value.messages) {
        const lockKey = `meta:wa:${msg.id}`;
        const acquired = await this.idempotency.acquire(lockKey);
        if (!acquired) continue; // Duplicate message dropped

        const senderWaId = msg.from;
        const profileName = value.contacts?.find((c: any) => c.wa_id === senderWaId)?.profile?.name || senderWaId;

        const contact = await this.contactRepo.upsertContact(
          tenantId,
          ChannelType.WHATSAPP,
          senderWaId,
          { name: profileName, phoneNumber: senderWaId },
        );

        const conv = await this.convRepo.findOrCreateForContact(
          tenantId,
          contact.id,
          ChannelType.WHATSAPP,
          account?.id,
        );

        let bodyText = msg.text?.body || null;
        let mediaType = MediaType.TEXT;
        const mediaUrl: string | null = null;

        if (msg.type === "image") {
          mediaType = MediaType.IMAGE;
          bodyText = bodyText || "Photo";
        } else if (msg.type === "audio") {
          mediaType = MediaType.AUDIO;
          bodyText = bodyText || "Voice message";
        } else if (msg.type === "video") {
          mediaType = MediaType.VIDEO;
          bodyText = bodyText || "Video";
        } else if (msg.type === "document") {
          mediaType = MediaType.DOCUMENT;
          bodyText = bodyText || (msg.document?.filename || "Document");
        }

        const savedMsg = await this.messageRepo.createMessage({
          conversationId: conv.id,
          externalId: msg.id,
          direction: MessageDirection.INBOUND,
          channel: ChannelType.WHATSAPP,
          type: mediaType,
          text: bodyText,
          mediaUrl,
          status: MessageStatus.RECEIVED,
        });

        await this.convRepo.updateLastMessage(tenantId, conv.id, bodyText, true);

        this.realtimeGateway.broadcastNewMessage(tenantId, conv.id, savedMsg);
      }
    }
  }

  private async handleMessengerEvent(pageId: string, event: any, isInstagram: boolean) {
    const channel = isInstagram ? ChannelType.INSTAGRAM : ChannelType.MESSENGER;
    const account = await this.tenantRepo.findAccountByExternalId(channel, pageId);
    let tenantId = account?.tenantId;

    if (!tenantId) {
      const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
      tenantId = defaultTenant.id;
    }

    // Read receipts
    if (event.read) {
      return;
    }

    if (event.message) {
      const mid = event.message.mid;
      const lockKey = `meta:fb:${mid}`;
      const acquired = await this.idempotency.acquire(lockKey);
      if (!acquired) return; // Deduplicated

      const senderPsid = event.sender?.id;
      if (!senderPsid || senderPsid === pageId) return; // Ignore echo

      const contact = await this.contactRepo.upsertContact(
        tenantId,
        channel,
        senderPsid,
        { name: `User ${senderPsid.slice(-4)}` },
      );

      const conv = await this.convRepo.findOrCreateForContact(
        tenantId,
        contact.id,
        channel,
        account?.id,
      );

      const bodyText = event.message.text || (event.message.attachments ? "Attachment" : "Message");
      const savedMsg = await this.messageRepo.createMessage({
        conversationId: conv.id,
        externalId: mid,
        direction: MessageDirection.INBOUND,
        channel,
        type: event.message.attachments ? MediaType.IMAGE : MediaType.TEXT,
        text: bodyText,
        status: MessageStatus.RECEIVED,
      });

      await this.convRepo.updateLastMessage(tenantId, conv.id, bodyText, true);

      this.realtimeGateway.broadcastNewMessage(tenantId, conv.id, savedMsg);
    }
  }
}
