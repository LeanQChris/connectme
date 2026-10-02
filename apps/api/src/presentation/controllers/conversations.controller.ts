import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  Inject,
} from "@nestjs/common";
import { ChannelType, ConversationStatus } from "@connectme/database";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { ListConversationsUseCase } from "../../application/use-cases/conversations/list-conversations.use-case";
import { GetConversationDetailUseCase } from "../../application/use-cases/conversations/get-conversation-detail.use-case";
import { UpdateConversationUseCase } from "../../application/use-cases/conversations/update-conversation.use-case";
import { SendReplyUseCase } from "../../application/use-cases/messages/send-reply.use-case";
import { AddInternalNoteUseCase } from "../../application/use-cases/messages/add-internal-note.use-case";
import { UpdateConversationDto } from "@connectme/contracts";

@Controller("api/conversations")
export class ConversationsController {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly listUseCase: ListConversationsUseCase,
    private readonly detailUseCase: GetConversationDetailUseCase,
    private readonly updateUseCase: UpdateConversationUseCase,
    private readonly sendReplyUseCase: SendReplyUseCase,
    private readonly addNoteUseCase: AddInternalNoteUseCase,
  ) {}

  private async resolveTenantId(headerTenantId?: string): Promise<string> {
    if (headerTenantId) return headerTenantId;
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
    return defaultTenant.id;
  }

  @Get()
  async list(
    @Headers("x-tenant-id") headerTenantId: string,
    @Query("channel") channel?: string,
    @Query("status") status?: string,
    @Query("assignee") assigneeId?: string,
    @Query("tag") tag?: string,
    @Query("limit") limit?: string,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const conversations = await this.listUseCase.execute(tenantId, {
      channel: channel ? (channel.toUpperCase() as ChannelType) : undefined,
      status: status ? (status.toUpperCase() as ConversationStatus) : undefined,
      assigneeId,
      tag,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return { conversations };
  }

  @Get(":id")
  async getDetail(
    @Headers("x-tenant-id") headerTenantId: string,
    @Param("id") id: string,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    return this.detailUseCase.execute(tenantId, id);
  }

  @Patch(":id")
  async update(
    @Headers("x-tenant-id") headerTenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const conversation = await this.updateUseCase.execute(tenantId, id, dto);
    return { conversation };
  }

  @Post(":id/reply")
  async reply(
    @Headers("x-tenant-id") headerTenantId: string,
    @Param("id") id: string,
    @Body() body: { text?: string; mediaUrl?: string; type?: string; author?: string },
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const message = await this.sendReplyUseCase.execute({
      tenantId,
      conversationId: id,
      text: body.text,
      mediaUrl: body.mediaUrl,
      mediaType: body.type,
      author: body.author,
    });
    return { message };
  }

  @Post(":id/note")
  async addNote(
    @Headers("x-tenant-id") headerTenantId: string,
    @Param("id") id: string,
    @Body() body: { text: string; author?: string },
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const message = await this.addNoteUseCase.execute({
      tenantId,
      conversationId: id,
      text: body.text,
      author: body.author,
    });
    return { message };
  }
}
