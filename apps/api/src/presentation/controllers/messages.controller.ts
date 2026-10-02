import { Controller, Post, Body } from "@nestjs/common";
import { SendReplyUseCase } from "../../application/use-cases/messages/send-reply.use-case";
import { AddInternalNoteUseCase } from "../../application/use-cases/messages/add-internal-note.use-case";
import { SendMessageDto, AddInternalNoteDto } from "@connectme/contracts";
import { TenantId } from "../auth/tenant-id.decorator";

@Controller("api/messages")
export class MessagesController {
  constructor(
    private readonly sendReplyUseCase: SendReplyUseCase,
    private readonly addNoteUseCase: AddInternalNoteUseCase,
  ) {}

  @Post()
  async createMessage(
    @TenantId() tenantId: string,
    @Body() dto: SendMessageDto & { isNote?: boolean },
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
  async createNote(@TenantId() tenantId: string, @Body() dto: AddInternalNoteDto) {
    return this.addNoteUseCase.execute({
      tenantId,
      conversationId: dto.conversationId,
      text: dto.text,
      author: dto.author,
    });
  }
}
