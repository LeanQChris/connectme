import { Controller, Post, Body, Headers, Inject } from "@nestjs/common";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { SendReplyUseCase } from "../../application/use-cases/messages/send-reply.use-case";
import { AddInternalNoteUseCase } from "../../application/use-cases/messages/add-internal-note.use-case";
import { SendMessageDto, AddInternalNoteDto } from "@connectme/contracts";

@Controller("api/messages")
export class MessagesController {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly sendReplyUseCase: SendReplyUseCase,
    private readonly addNoteUseCase: AddInternalNoteUseCase,
  ) {}

  private async resolveTenantId(headerTenantId?: string): Promise<string> {
    if (headerTenantId) return headerTenantId;
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
    return defaultTenant.id;
  }

  @Post()
  async createMessage(
    @Headers("x-tenant-id") headerTenantId: string,
    @Body() dto: SendMessageDto & { isNote?: boolean },
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);

    if (dto.isNote) {
      return this.addNoteUseCase.execute({
        tenantId,
        conversationId: dto.conversationId,
        text: dto.text || "",
        author: dto.author,
      });
    }

    return this.sendReplyUseCase.execute({
      tenantId,
      conversationId: dto.conversationId,
      text: dto.text,
      mediaUrl: dto.mediaUrl,
      mediaType: dto.mediaType,
      author: dto.author,
    });
  }

  @Post("note")
  async createNote(
    @Headers("x-tenant-id") headerTenantId: string,
    @Body() dto: AddInternalNoteDto,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    return this.addNoteUseCase.execute({
      tenantId,
      conversationId: dto.conversationId,
      text: dto.text,
      author: dto.author,
    });
  }
}
