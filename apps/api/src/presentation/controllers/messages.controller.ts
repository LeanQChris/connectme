import { Controller, Post, Body } from "@nestjs/common";
import { z } from "zod";
import { SendReplyUseCase } from "../../application/use-cases/messages/send-reply.use-case";
import { AddInternalNoteUseCase } from "../../application/use-cases/messages/add-internal-note.use-case";
import {
  SendMessageDto,
  AddInternalNoteDto,
  AddInternalNoteDtoSchema,
  MessageTypeSchema,
} from "@connectme/contracts";
import { TenantId } from "../auth/tenant-id.decorator";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";

const SendMessageWithNoteSchema = z
  .object({
    conversationId: z.string().min(1),
    text: z.string().max(4096).optional(),
    mediaUrl: z.string().max(2048).optional(),
    mediaType: MessageTypeSchema.optional(),
    author: z.string().max(128).optional(),
    isNote: z.boolean().optional(),
  })
  .strict();

@Controller("api/messages")
export class MessagesController {
  constructor(
    private readonly sendReplyUseCase: SendReplyUseCase,
    private readonly addNoteUseCase: AddInternalNoteUseCase,
  ) {}

  @Post()
  async createMessage(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(SendMessageWithNoteSchema)) dto: SendMessageDto & { isNote?: boolean },
  ) {
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
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(AddInternalNoteDtoSchema)) dto: AddInternalNoteDto,
  ) {
    return this.addNoteUseCase.execute({
      tenantId,
      conversationId: dto.conversationId,
      text: dto.text,
      author: dto.author,
    });
  }
}
