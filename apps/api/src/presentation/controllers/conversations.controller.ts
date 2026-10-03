import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from "@nestjs/common";
import { ChannelType, ConversationStatus } from "@connectme/database";
import { ListConversationsUseCase } from "../../application/use-cases/conversations/list-conversations.use-case";
import { GetConversationDetailUseCase } from "../../application/use-cases/conversations/get-conversation-detail.use-case";
import { UpdateConversationUseCase } from "../../application/use-cases/conversations/update-conversation.use-case";
import { SendReplyUseCase } from "../../application/use-cases/messages/send-reply.use-case";
import { AddInternalNoteUseCase } from "../../application/use-cases/messages/add-internal-note.use-case";
import { UpdateConversationDto, UpdateConversationDtoSchema } from "@connectme/contracts";
import { TenantId } from "../auth/tenant-id.decorator";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { ReplyBodySchema, NoteBodySchema } from "../validation/schemas";
import { clampLimit } from "../validation/parse";

@Controller("api/conversations")
export class ConversationsController {
  constructor(
    private readonly listUseCase: ListConversationsUseCase,
    private readonly detailUseCase: GetConversationDetailUseCase,
    private readonly updateUseCase: UpdateConversationUseCase,
    private readonly sendReplyUseCase: SendReplyUseCase,
    private readonly addNoteUseCase: AddInternalNoteUseCase,
  ) {}

  @Get()
  async list(
    @TenantId() tenantId: string,
    @Query("channel") channel?: string,
    @Query("status") status?: string,
    @Query("assignee") assigneeId?: string,
    @Query("tag") tag?: string,
    @Query("limit") limit?: string,
  ) {
    const conversations = await this.listUseCase.execute(tenantId, {
      channel: channel ? (channel.toUpperCase() as ChannelType) : undefined,
      status: status ? (status.toUpperCase() as ConversationStatus) : undefined,
      assigneeId,
      tag,
      limit: clampLimit(limit, 50),
    });
    return { conversations };
  }

  @Get(":id")
  async getDetail(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Query("limit") limit?: string,
    @Query("before") before?: string,
  ) {
    return this.detailUseCase.execute(tenantId, id, {
      limit: clampLimit(limit, 50, 200),
      before,
    });
  }

  @Patch(":id")
  async update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateConversationDtoSchema)) dto: UpdateConversationDto,
  ) {
    const conversation = await this.updateUseCase.execute(tenantId, id, dto);
    return { conversation };
  }

  @Post(":id/reply")
  async reply(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ReplyBodySchema))
    body: { text?: string; mediaUrl?: string; type?: string; author?: string },
  ) {
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
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(NoteBodySchema)) body: { text: string; author?: string },
  ) {
    const message = await this.addNoteUseCase.execute({
      tenantId,
      conversationId: id,
      text: body.text,
      author: body.author,
    });
    return { message };
  }
}
