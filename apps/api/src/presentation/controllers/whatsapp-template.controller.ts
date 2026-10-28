import { RequireRoles } from "../auth/require-roles.decorator";
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
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
  @RequireRoles("owner", "admin")
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

  @Patch(":id")
  @RequireRoles("owner", "admin")
  async updateDraft(@TenantId() tenantId: string, @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(CreateWhatsAppTemplateDraftSchema)) dto: CreateWhatsAppTemplateDraftDto) {
    return { template: await this.templateService.updateDraft(tenantId, id, dto) };
  }

  @Post(":id/submit")
  @RequireRoles("owner", "admin")
  async submitTemplate(@TenantId() tenantId: string, @Param("id", new ParseUUIDPipe()) id: string) {
    return { template: await this.templateService.submitTemplate(tenantId, id) };
  }

  @Post()
  @RequireRoles("owner", "admin")
  async createTemplateDraft(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(CreateWhatsAppTemplateDraftSchema))
    dto: CreateWhatsAppTemplateDraftDto,
  ) {
    const template = await this.templateService.createTemplateDraft(tenantId, dto);
    return { template };
  }
}
