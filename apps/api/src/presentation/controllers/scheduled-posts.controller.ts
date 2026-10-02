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
import { CreateScheduledPostDto, UpdateScheduledPostDto } from "@connectme/contracts";
import { CreateScheduledPostUseCase } from "../../application/use-cases/scheduling/create-scheduled-post.use-case";
import { ListScheduledPostsUseCase } from "../../application/use-cases/scheduling/list-scheduled-posts.use-case";
import { CancelScheduledPostUseCase } from "../../application/use-cases/scheduling/cancel-scheduled-post.use-case";
import { UpdateScheduledPostUseCase } from "../../application/use-cases/scheduling/update-scheduled-post.use-case";
import { toScheduledPostDto } from "../serializers/scheduling.serializer";
import { TenantId } from "../auth/tenant-id.decorator";

@Controller("api/scheduled-posts")
export class ScheduledPostsController {
  constructor(
    private readonly createUseCase: CreateScheduledPostUseCase,
    private readonly listUseCase: ListScheduledPostsUseCase,
    private readonly cancelUseCase: CancelScheduledPostUseCase,
    private readonly updateUseCase: UpdateScheduledPostUseCase,
  ) {}

  @Post()
  async create(@TenantId() tenantId: string, @Body() dto: CreateScheduledPostDto) {
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
      status: status ? (status.toUpperCase() as ScheduledPostStatus) : undefined,
      accountId,
      channel: channel ? (channel.toUpperCase() as ChannelType) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
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
    @Body() dto: UpdateScheduledPostDto,
  ) {
    const row = await this.updateUseCase.execute({ tenantId, id, dto });
    return toScheduledPostDto(row!);
  }
}
