import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
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
import { WhatsAppClient, AesVaultService, ChannelHttpError } from "@connectme/channels";
import { InboxRealtimeGateway } from "../../presentation/gateways/inbox-realtime.gateway";
import { supportsWhatsAppTextTemplate } from "@connectme/contracts";
import type {
  WhatsAppTemplateDto,
  SendWhatsAppTemplateDto,
  CreateWhatsAppTemplateDraftDto,
} from "@connectme/contracts";

@Injectable()
export class WhatsAppTemplateService {

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
    const templates = await this.templateRepo.find({ where: { tenantId }, order: { createdAt: "ASC" } });
    return templates.map((t) => this.toDto(t));
  }

  private toDto(t: WhatsAppTemplate): WhatsAppTemplateDto {
    return {
      id: t.id, name: t.name, language: t.language,
      category: t.category as WhatsAppTemplateDto["category"],
      status: t.status as WhatsAppTemplateDto["status"], components: t.components,
      providerId: typeof t.rawTemplate?.id === "string" ? t.rawTemplate.id : undefined,
      rejectionReason: typeof t.rawTemplate?.rejected_reason === "string" ? t.rawTemplate.rejected_reason : undefined,
      createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
    };
  }

  private async credentials(tenantId: string) {
    const creds = await this.credentialRepo.findOne({ where: { tenantId } });
    if (!creds?.waBusinessAccountId || !creds.waAccessTokenEnc) {
      throw new BadRequestException("Configure the WhatsApp Business Account ID and access token in settings first.");
    }
    return { creds, token: this.vault.decryptStrict<string>(creds.waAccessTokenEnc) };
  }

  public async syncTemplates(tenantId: string): Promise<{ syncedCount: number; templates: WhatsAppTemplateDto[] }> {
    const { creds, token } = await this.credentials(tenantId);
    let remote: Array<Record<string, unknown>>;
    try { remote = await this.whatsAppClient.fetchTemplates(creds.waBusinessAccountId!, token); }
    catch { throw new ServiceUnavailableException("Unable to sync templates from Meta. Check the WABA ID, token and permissions, then retry."); }
    if (remote.some((r) => typeof r.id !== "string" || typeof r.name !== "string" || typeof r.language !== "string" || typeof r.status !== "string" || !Array.isArray(r.components))) {
      throw new ServiceUnavailableException("Meta returned incomplete templates; sync was not saved.");
    }
    await this.templateRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(WhatsAppTemplate);
      const existing = await repo.find({ where: { tenantId }, lock: { mode: "pessimistic_write" } });
      for (const raw of remote) {
        await repo.save(repo.create({ ...existing.find((t) => t.name === raw.name && t.language === raw.language), tenantId, name: raw.name as string, language: raw.language as string,
          category: String(raw.category || "UTILITY"), status: String(raw.status),
          components: raw.components as WhatsAppTemplate["components"], rawTemplate: { ...raw, _wabaId: creds.waBusinessAccountId },
        }));
      }
      for (const t of existing) {
        if (t.rawTemplate?.id && !remote.some((r) => r.name === t.name && r.language === t.language)) {
          t.status = "DISABLED";
          await repo.save(t);
        }
      }
    });
    return { syncedCount: remote.length, templates: await this.listTemplates(tenantId) };
  }

  public async createTemplateDraft(tenantId: string, dto: CreateWhatsAppTemplateDraftDto): Promise<WhatsAppTemplateDto> {
    const components = this.draftComponents(dto);
    if (await this.templateRepo.existsBy({ tenantId, name: dto.name, language: dto.language })) {
      throw new ConflictException("A template with this name and language already exists.");
    }
    return this.toDto(await this.templateRepo.save(this.templateRepo.create({ tenantId, name: dto.name,
      language: dto.language, category: dto.category, status: "DRAFT", components })));
  }

  private draftComponents(dto: CreateWhatsAppTemplateDraftDto): WhatsAppTemplate["components"] {
    if (dto.category === "AUTHENTICATION" || dto.buttons?.length) {
      throw new BadRequestException("Create authentication and button templates in Meta WhatsApp Manager, then sync them here.");
    }
    const components: WhatsAppTemplate["components"] = [];
    if (dto.headerText) components.push({ type: "HEADER", format: "TEXT", text: dto.headerText,
      ...(dto.headerExamples?.length ? { example: { header_text: dto.headerExamples } } : {}) });
    components.push({ type: "BODY", text: dto.bodyText,
      ...(dto.bodyExamples?.length ? { example: { body_text: [dto.bodyExamples] } } : {}) });
    if (dto.footerText) components.push({ type: "FOOTER", text: dto.footerText });
    return components;
  }

  public async updateDraft(tenantId: string, id: string, dto: CreateWhatsAppTemplateDraftDto): Promise<WhatsAppTemplateDto> {
    const components = this.draftComponents(dto);
    return this.templateRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(WhatsAppTemplate);
      const t = await repo.findOne({ where: { tenantId, id }, lock: { mode: "pessimistic_write" } });
      if (!t) throw new NotFoundException("Template not found.");
      if (t.status !== "DRAFT" || t.rawTemplate?.id) throw new ConflictException("Only unsubmitted drafts can be edited here. Manage submitted templates in Meta WhatsApp Manager.");
      if (t.name !== dto.name || t.language !== dto.language) throw new BadRequestException("Create a new draft to change the name or language.");
      t.category = dto.category;
      t.components = components;
      return this.toDto(await repo.save(t));
    });
  }

  private variableCount(text = ""): number {
    const numbers = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    const unique = [...new Set(numbers)].sort((a, b) => a - b);
    if (unique.some((n, i) => n !== i + 1) || text.replace(/\{\{\d+\}\}/g, "").match(/\{\{|\}\}/)) {
      throw new BadRequestException("Use sequential numbered variables starting at {{1}}.");
    }
    return unique.length;
  }

  public async submitTemplate(tenantId: string, id: string): Promise<WhatsAppTemplateDto> {
    const { creds, token } = await this.credentials(tenantId);
    let failure: Error | undefined;
    const saved = await this.templateRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(WhatsAppTemplate);
      const t = await repo.findOne({ where: { tenantId, id }, lock: { mode: "pessimistic_write" } });
      if (!t) throw new NotFoundException("Template not found.");
      if (t.status !== "DRAFT" || t.rawTemplate?.id) throw new ConflictException("Only an unsubmitted draft can be submitted. Sync to check Meta status.");
      for (const c of t.components) {
        const count = this.variableCount(c.text);
        const examples = c.type === "HEADER" ? c.example?.header_text : (c.example?.body_text as unknown[][] | undefined)?.[0];
        if (count && (!Array.isArray(examples) || examples.length !== count)) throw new BadRequestException("Provide an example for each header and body variable before submission.");
        if (c.type === "FOOTER" && count) throw new BadRequestException("Footer variables are not supported by Meta.");
      }
      t.status = "SUBMITTED";
      t.rawTemplate = { _wabaId: creds.waBusinessAccountId };
      return repo.save(t);
    });
    // Commit the reservation before the network call: a crash must not make a possibly
    // submitted template retryable. Sync reconciles an uncertain provider outcome.
    let raw: Record<string, unknown> | undefined;
    let confirmedRejection = false;
    try {
      raw = await this.whatsAppClient.submitTemplate(creds.waBusinessAccountId!, token, {
        name: saved.name, language: saved.language, category: saved.category, components: saved.components,
      });
      if (typeof raw.id !== "string") throw new Error("Missing submission ID");
    } catch (err) {
      if (err instanceof ChannelHttpError && err.status >= 400 && err.status < 500 && !err.retryable) {
        confirmedRejection = true;
        failure = new BadRequestException(`Meta rejected submission: ${err.message}`);
      } else {
        failure = new ServiceUnavailableException("Submission could not be confirmed. Sync from Meta before retrying to avoid a duplicate submission.");
      }
    }
    const result = await this.templateRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(WhatsAppTemplate);
      const current = await repo.findOneOrFail({ where: { tenantId, id }, lock: { mode: "pessimistic_write" } });
      // A concurrent sync may already have confirmed approval; preserve it.
      if (current.status === "SUBMITTED") {
        if (confirmedRejection) current.status = "DRAFT";
        else if (!failure && raw) {
          current.status = "PENDING";
          current.rawTemplate = { ...raw, _wabaId: creds.waBusinessAccountId };
        }
        return repo.save(current);
      }
      return current;
    });
    if (failure) throw failure;
    return this.toDto(result);
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
    if (!creds?.waPhoneNumberId || !creds?.waAccessTokenEnc || !creds.waBusinessAccountId) {
      throw new BadRequestException("WhatsApp credentials not configured.");
    }

    const token = this.vault.decryptStrict<string>(creds.waAccessTokenEnc);

    const template = await this.templateRepo.findOne({
      where: { tenantId, name: dto.templateName, language: dto.languageCode || "en_US" },
    });

    if (!template || template.status !== "APPROVED" || !template.rawTemplate?.id || template.rawTemplate._wabaId !== creds.waBusinessAccountId) {
      throw new BadRequestException("Sync an approved template from the configured WhatsApp Business Account before sending.");
    }
    let remote: Array<Record<string, unknown>>;
    try { remote = await this.whatsAppClient.fetchTemplates(creds.waBusinessAccountId!, token); }
    catch { throw new ServiceUnavailableException("Could not verify current Meta approval. Please retry later."); }
    const approved = remote.find((r) => r.id === template.rawTemplate?.id && r.name === template.name && r.language === template.language);
    if (approved?.status !== "APPROVED") throw new BadRequestException("This template is no longer approved by Meta. Sync templates in settings.");
    template.components = approved.components as WhatsAppTemplate["components"];
    if (!supportsWhatsAppTextTemplate({ category: template.category as WhatsAppTemplateDto["category"], components: template.components })) {
      throw new BadRequestException("This template requires media or dynamic button parameters that are not supported by this composer.");
    }
    for (const [type, values] of [["HEADER", dto.headerVariables], ["BODY", dto.bodyVariables]] as const) {
      const count = this.variableCount(template.components.find((c) => c.type === type)?.text);
      if ((values?.length || 0) !== count || values?.some((v) => !v.trim())) throw new BadRequestException(`Fill all ${type.toLowerCase()} variables before sending.`);
    }

    // Build plain-text preview of template for conversation history
    let bodyText = `[Template: ${dto.templateName}]`;
    if (template?.components) {
      const bodyComp = template.components.find((c) => c.type === "BODY");
      if (bodyComp?.text) {
        let rendered = bodyComp.text;
        if (dto.bodyVariables) {
          dto.bodyVariables.forEach((val, idx) => {
            rendered = rendered.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, "g"), () => val);
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
