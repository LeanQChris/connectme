import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Inject,
} from "@nestjs/common";
import { ScheduledPostStatus, ChannelType } from "@connectme/database";
import { CreateScheduledPostDto, UpdateScheduledPostDto } from "@connectme/contracts";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { CreateScheduledPostUseCase } from "../../application/use-cases/scheduling/create-scheduled-post.use-case";
import { ListScheduledPostsUseCase } from "../../application/use-cases/scheduling/list-scheduled-posts.use-case";
import { CancelScheduledPostUseCase } from "../../application/use-cases/scheduling/cancel-scheduled-post.use-case";
import { UpdateScheduledPostUseCase } from "../../application/use-cases/scheduling/update-scheduled-post.use-case";
import { toScheduledPostDto } from "../serializers/scheduling.serializer";

@Controller("api/scheduled-posts")
export class ScheduledPostsController {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly createUseCase: CreateScheduledPostUseCase,
    private readonly listUseCase: ListScheduledPostsUseCase,
    private readonly cancelUseCase: CancelScheduledPostUseCase,
    private readonly updateUseCase: UpdateScheduledPostUseCase,
  ) {}

  private async resolveTenantId(headerTenantId?: string): Promise<string> {
    if (headerTenantId) return headerTenantId;
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant(
      "system",
      "admin@connectme.local",
    );
    return defaultTenant.id;
  }

  @Post()
  async create(
    @Headers("x-tenant-id") headerTenantId: string,
    @Body() dto: CreateScheduledPostDto,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const row = await this.createUseCase.execute({ tenantId, dto, createdBy: dto.createdBy });
    return toScheduledPostDto(row!);
  }

  @Get()
  async list(
    @Headers("x-tenant-id") headerTenantId: string,
    @Query("status") status?: string,
    @Query("accountId") accountId?: string,
    @Query("channel") channel?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
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
  async cancel(
    @Headers("x-tenant-id") headerTenantId: string,
    @Param("id") id: string,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const row = await this.cancelUseCase.execute(tenantId, id);
    return toScheduledPostDto(row);
  }

  @Patch(":id")
  async update(
    @Headers("x-tenant-id") headerTenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateScheduledPostDto,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const row = await this.updateUseCase.execute({ tenantId, id, dto });
    return toScheduledPostDto(row!);
  }
}
