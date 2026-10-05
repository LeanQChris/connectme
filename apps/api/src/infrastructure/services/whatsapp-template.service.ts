import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  WhatsAppTemplate,
  TenantCredential,
  Conversation,
  Message,
  Contact,
  ChannelType,
  MessageDirection,
  MessageStatus,
  MediaType,
} from "@connectme/database";
import { WhatsAppClient, AesVaultService } from "@connectme/channels";
import { InboxRealtimeGateway } from "../../presentation/gateways/inbox-realtime.gateway";
import type {
  WhatsAppTemplateDto,
  SendWhatsAppTemplateDto,
  CreateWhatsAppTemplateDraftDto,
} from "@connectme/contracts";

const SEED_TEMPLATES = [
  {
    name: "support_followup",
    language: "en_US",
    category: "UTILITY",
    status: "APPROVED",
    components: [
      {
        type: "HEADER" as const,
        format: "TEXT" as const,
        text: "Customer Support Follow-up",
      },
      {
        type: "BODY" as const,
        text: "Hi {{1}}, we are following up on your request regarding {{2}}. Please let us know if you still need assistance!",
        example: { body_text: [["John", "Order #4092"]] },
      },
      {
        type: "FOOTER" as const,
        text: "Reply STOP to unsubscribe",
      },
      {
        type: "BUTTONS" as const,
        buttons: [
          { type: "QUICK_REPLY" as const, text: "I need help" },
          { type: "QUICK_REPLY" as const, text: "All resolved" },
        ],
      },
    ],
  },
  {
    name: "order_status_update",
    language: "en_US",
    category: "UTILITY",
    status: "APPROVED",
    components: [
      {
        type: "HEADER" as const,
        format: "TEXT" as const,
        text: "Order Update",
      },
      {
        type: "BODY" as const,
        text: "Hello {{1}}, your order {{2}} has been {{3}}. You can track your shipment anytime.",
        example: { body_text: [["Sarah", "#8831", "shipped"]] },
      },
      {
        type: "FOOTER" as const,
        text: "ConnectMe Automated Notifications",
      },
    ],
  },
  {
    name: "appointment_reminder",
    language: "en_US",
    category: "UTILITY",
    status: "APPROVED",
    components: [
      {
        type: "HEADER" as const,
        format: "TEXT" as const,
        text: "Upcoming Appointment",
      },
      {
        type: "BODY" as const,
        text: "Hi {{1}}, this is a friendly reminder for your appointment scheduled on {{2}} with {{3}}.",
        example: { body_text: [["Alex", "Tomorrow at 3 PM", "Dr. Smith"]] },
      },
      {
        type: "BUTTONS" as const,
        buttons: [
          { type: "QUICK_REPLY" as const, text: "Confirm" },
          { type: "QUICK_REPLY" as const, text: "Reschedule" },
        ],
      },
    ],
  },
];

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);

  constructor(
    @InjectRepository(WhatsAppTemplate)
    private readonly templateRepo: Repository<WhatsAppTemplate>,
    @InjectRepository(TenantCredential)
    private readonly credentialRepo: Repository<TenantCredential>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly whatsAppClient: WhatsAppClient,
    private readonly vault: AesVaultService,
    private readonly realtime: InboxRealtimeGateway,
  ) {}

  public async listTemplates(tenantId: string): Promise<WhatsAppTemplateDto[]> {
    let templates = await this.templateRepo.find({
      where: { tenantId },
      order: { createdAt: "ASC" },
    });

    // Auto-seed standard templates if tenant has none yet
    if (templates.length === 0) {
      for (const seed of SEED_TEMPLATES) {
        const entity = this.templateRepo.create({
          tenantId,
          name: seed.name,
          language: seed.language,
          category: seed.category,
          status: seed.status,
          components: seed.components,
        });
        await this.templateRepo.save(entity);
      }

      templates = await this.templateRepo.find({
        where: { tenantId },
        order: { createdAt: "ASC" },
      });
    }

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      category: t.category as any,
      status: t.status as any,
      components: t.components as any,
      rawTemplate: t.rawTemplate ?? undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  public async syncTemplates(tenantId: string): Promise<{ syncedCount: number; templates: WhatsAppTemplateDto[] }> {
    const creds = await this.credentialRepo.findOne({ where: { tenantId } });
    if (!creds?.waPhoneNumberId || !creds?.waAccessTokenEnc) {
      throw new BadRequestException("WhatsApp credentials not configured for this tenant.");
    }

    const token = this.vault.decryptStrict<string>(creds.waAccessTokenEnc);
    const remoteTemplates = await this.whatsAppClient.fetchTemplates(creds.waPhoneNumberId, token);

    let syncedCount = 0;
    for (const raw of remoteTemplates) {
      if (!raw.name || typeof raw.name !== "string") continue;
      const name = raw.name;
      const language = String(raw.language || "en_US");
      const category = String(raw.category || "UTILITY");
      const status = String(raw.status || "APPROVED");
      const components = Array.isArray(raw.components) ? raw.components : [];

      let existing = await this.templateRepo.findOne({
        where: { tenantId, name, language },
      });

      if (!existing) {
        existing = this.templateRepo.create({
          tenantId,
          name,
          language,
          category,
          status,
          components: components as any,
          rawTemplate: raw,
        });
      } else {
        existing.category = category;
        existing.status = status;
        existing.components = components as any;
        existing.rawTemplate = raw;
      }

      await this.templateRepo.save(existing);
      syncedCount++;
    }

    const all = await this.listTemplates(tenantId);
    return { syncedCount, templates: all };
  }

  public async createTemplateDraft(
    tenantId: string,
    dto: CreateWhatsAppTemplateDraftDto,
  ): Promise<WhatsAppTemplateDto> {
    const components: any[] = [];

    if (dto.headerText) {
      components.push({ type: "HEADER", format: "TEXT", text: dto.headerText });
    }

    components.push({ type: "BODY", text: dto.bodyText });

    if (dto.footerText) {
      components.push({ type: "FOOTER", text: dto.footerText });
    }

    if (dto.buttons && dto.buttons.length > 0) {
      components.push({ type: "BUTTONS", buttons: dto.buttons });
    }

    const entity = this.templateRepo.create({
      tenantId,
      name: dto.name,
      language: dto.language,
      category: dto.category,
      status: "APPROVED",
      components,
    });

    const saved = await this.templateRepo.save(entity);

    return {
      id: saved.id,
      name: saved.name,
      language: saved.language,
      category: saved.category as any,
      status: saved.status as any,
      components: saved.components as any,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }

  public async sendTemplateMessage(
    tenantId: string,
    dto: SendWhatsAppTemplateDto,
  ): Promise<{ success: boolean; messageId: string; externalId?: string | null }> {
    const conv = await this.conversationRepo.findOne({
      where: { id: dto.conversationId, tenantId },
      relations: ["contact"],
    });

    if (!conv) {
      throw new NotFoundException("Conversation not found.");
    }

    if (conv.contact.channel !== ChannelType.WHATSAPP) {
      throw new BadRequestException("WhatsApp Templates can only be sent to WhatsApp conversations.");
    }

    const creds = await this.credentialRepo.findOne({ where: { tenantId } });
    if (!creds?.waPhoneNumberId || !creds?.waAccessTokenEnc) {
      throw new BadRequestException("WhatsApp credentials not configured.");
    }

    const token = this.vault.decryptStrict<string>(creds.waAccessTokenEnc);

    const template = await this.templateRepo.findOne({
      where: { tenantId, name: dto.templateName },
    });

    // Build plain-text preview of template for conversation history
    let bodyText = `[Template: ${dto.templateName}]`;
    if (template?.components) {
      const bodyComp = template.components.find((c) => c.type === "BODY");
      if (bodyComp?.text) {
        let rendered = bodyComp.text;
        if (dto.bodyVariables) {
          dto.bodyVariables.forEach((val, idx) => {
            rendered = rendered.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, "g"), val);
          });
        }
        bodyText = rendered;
      }
    }

    const result = await this.whatsAppClient.sendTemplateMessage(
      creds.waPhoneNumberId,
      token,
      conv.contact.externalId,
      dto.templateName,
      dto.languageCode || template?.language || "en_US",
      dto.headerVariables,
      dto.bodyVariables,
      dto.buttonPayload,
    );

    const message = this.messageRepo.create({
      conversationId: conv.id,
      direction: MessageDirection.OUTBOUND,
      channel: ChannelType.WHATSAPP,
      type: MediaType.TEXT,
      text: bodyText,
      status: MessageStatus.SENT,
      externalId: result.externalId ?? undefined,
    });

    const savedMsg = await this.messageRepo.save(message);

    conv.lastMessageText = bodyText.slice(0, 200);
    conv.lastMessageAt = new Date();
    await this.conversationRepo.save(conv);

    this.realtime.broadcastNewMessage(tenantId, conv.id, {
      ...savedMsg,
      createdAt: savedMsg.createdAt.toISOString(),
    });

    this.realtime.broadcastConversationUpdate(tenantId, {
      id: conv.id,
      lastMessageText: conv.lastMessageText,
      lastMessageAt: conv.lastMessageAt.toISOString(),
    });

    return {
      success: true,
      messageId: savedMsg.id,
      externalId: result.externalId,
    };
  }
}
