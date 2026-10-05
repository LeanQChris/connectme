import {
  Controller,
  Get,
  Post,
  Body,
} from "@nestjs/common";
import { WhatsAppTemplateService } from "../../infrastructure/services/whatsapp-template.service";
import { TenantId } from "../auth/tenant-id.decorator";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import {
  SendWhatsAppTemplateSchema,
  CreateWhatsAppTemplateDraftSchema,
  type SendWhatsAppTemplateDto,
  type CreateWhatsAppTemplateDraftDto,
} from "@connectme/contracts";

@Controller("api/whatsapp/templates")
export class WhatsAppTemplateController {
  constructor(private readonly templateService: WhatsAppTemplateService) {}

  @Get()
  async listTemplates(@TenantId() tenantId: string) {
    const templates = await this.templateService.listTemplates(tenantId);
    return { templates };
  }

  @Post("sync")
  async syncTemplates(@TenantId() tenantId: string) {
    return this.templateService.syncTemplates(tenantId);
  }

  @Post("send")
  async sendTemplateMessage(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(SendWhatsAppTemplateSchema)) dto: SendWhatsAppTemplateDto,
  ) {
    return this.templateService.sendTemplateMessage(tenantId, dto);
  }

  @Post()
  async createTemplateDraft(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(CreateWhatsAppTemplateDraftSchema))
    dto: CreateWhatsAppTemplateDraftDto,
  ) {
    const template = await this.templateService.createTemplateDraft(tenantId, dto);
    return { template };
  }
}
