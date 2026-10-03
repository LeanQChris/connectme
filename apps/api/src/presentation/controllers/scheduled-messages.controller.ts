import { Controller, Get, Post, Delete, Body, Param, Query } from "@nestjs/common";
import { ScheduledMessageStatus } from "@connectme/database";
import { CreateScheduledMessageDto, CreateScheduledMessageDtoSchema } from "@connectme/contracts";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { CreateScheduledMessageUseCase } from "../../application/use-cases/scheduling/create-scheduled-message.use-case";
import { ListScheduledMessagesUseCase } from "../../application/use-cases/scheduling/list-scheduled-messages.use-case";
import { CancelScheduledMessageUseCase } from "../../application/use-cases/scheduling/cancel-scheduled-message.use-case";
import { toScheduledMessageDto } from "../serializers/scheduling.serializer";
import { TenantId } from "../auth/tenant-id.decorator";
import { optionalDate } from "../validation/parse";

function parseStatus(value?: string): ScheduledMessageStatus | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return (Object.values(ScheduledMessageStatus) as string[]).includes(upper)
    ? (upper as ScheduledMessageStatus)
    : undefined;
}

@Controller("api/scheduled-messages")
export class ScheduledMessagesController {
  constructor(
    private readonly createUseCase: CreateScheduledMessageUseCase,
    private readonly listUseCase: ListScheduledMessagesUseCase,
    private readonly cancelUseCase: CancelScheduledMessageUseCase,
  ) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(CreateScheduledMessageDtoSchema)) dto: CreateScheduledMessageDto,
  ) {
    const row = await this.createUseCase.execute({ tenantId, dto, createdBy: dto.createdBy });
    return toScheduledMessageDto(row);
  }

  @Get()
  async list(
    @TenantId() tenantId: string,
    @Query("status") status?: string,
    @Query("conversationId") conversationId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const rows = await this.listUseCase.execute(tenantId, {
      status: parseStatus(status),
      conversationId,
      from: optionalDate(from, "from"),
      to: optionalDate(to, "to"),
    });
    return rows.map(toScheduledMessageDto);
  }

  @Delete(":id")
  async cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    const row = await this.cancelUseCase.execute(tenantId, id);
    return toScheduledMessageDto(row);
  }
}
