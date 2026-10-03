import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ScheduledPostStatus, ChannelType } from "@connectme/database";
import {
  CreateScheduledPostDto,
  UpdateScheduledPostDto,
  CreateScheduledPostDtoSchema,
  UpdateScheduledPostDtoSchema,
} from "@connectme/contracts";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { CreateScheduledPostUseCase } from "../../application/use-cases/scheduling/create-scheduled-post.use-case";
import { ListScheduledPostsUseCase } from "../../application/use-cases/scheduling/list-scheduled-posts.use-case";
import { CancelScheduledPostUseCase } from "../../application/use-cases/scheduling/cancel-scheduled-post.use-case";
import { UpdateScheduledPostUseCase } from "../../application/use-cases/scheduling/update-scheduled-post.use-case";
import { toScheduledPostDto } from "../serializers/scheduling.serializer";
import { TenantId } from "../auth/tenant-id.decorator";
import { optionalDate } from "../validation/parse";

function parseStatus(value?: string): ScheduledPostStatus | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return (Object.values(ScheduledPostStatus) as string[]).includes(upper)
    ? (upper as ScheduledPostStatus)
    : undefined;
}

function parseChannel(value?: string): ChannelType | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return (Object.values(ChannelType) as string[]).includes(upper)
    ? (upper as ChannelType)
    : undefined;
}

@Controller("api/scheduled-posts")
export class ScheduledPostsController {
  constructor(
    private readonly createUseCase: CreateScheduledPostUseCase,
    private readonly listUseCase: ListScheduledPostsUseCase,
    private readonly cancelUseCase: CancelScheduledPostUseCase,
    private readonly updateUseCase: UpdateScheduledPostUseCase,
  ) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(CreateScheduledPostDtoSchema)) dto: CreateScheduledPostDto,
  ) {
    const row = await this.createUseCase.execute({ tenantId, dto, createdBy: dto.createdBy });
    return toScheduledPostDto(row!);
  }

  @Get()
  async list(
    @TenantId() tenantId: string,
    @Query("status") status?: string,
    @Query("accountId") accountId?: string,
    @Query("channel") channel?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const rows = await this.listUseCase.execute(tenantId, {
      status: parseStatus(status),
      accountId,
      channel: parseChannel(channel),
      from: optionalDate(from, "from"),
      to: optionalDate(to, "to"),
    });
    return rows.map(toScheduledPostDto);
  }

  @Delete(":id")
  async cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    const row = await this.cancelUseCase.execute(tenantId, id);
    return toScheduledPostDto(row);
  }

  @Patch(":id")
  async update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateScheduledPostDtoSchema)) dto: UpdateScheduledPostDto,
  ) {
    const row = await this.updateUseCase.execute({ tenantId, id, dto });
    return toScheduledPostDto(row!);
  }
}
