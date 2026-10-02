import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Inject,
} from "@nestjs/common";
import { ScheduledMessageStatus } from "@connectme/database";
import { CreateScheduledMessageDto } from "@connectme/contracts";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { CreateScheduledMessageUseCase } from "../../application/use-cases/scheduling/create-scheduled-message.use-case";
import { ListScheduledMessagesUseCase } from "../../application/use-cases/scheduling/list-scheduled-messages.use-case";
import { CancelScheduledMessageUseCase } from "../../application/use-cases/scheduling/cancel-scheduled-message.use-case";
import { toScheduledMessageDto } from "../serializers/scheduling.serializer";

@Controller("api/scheduled-messages")
export class ScheduledMessagesController {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly createUseCase: CreateScheduledMessageUseCase,
    private readonly listUseCase: ListScheduledMessagesUseCase,
    private readonly cancelUseCase: CancelScheduledMessageUseCase,
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
    @Body() dto: CreateScheduledMessageDto,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const row = await this.createUseCase.execute({ tenantId, dto, createdBy: dto.createdBy });
    return toScheduledMessageDto(row);
  }

  @Get()
  async list(
    @Headers("x-tenant-id") headerTenantId: string,
    @Query("status") status?: string,
    @Query("conversationId") conversationId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const rows = await this.listUseCase.execute(tenantId, {
      status: status ? (status.toUpperCase() as ScheduledMessageStatus) : undefined,
      conversationId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return rows.map(toScheduledMessageDto);
  }

  @Delete(":id")
  async cancel(
    @Headers("x-tenant-id") headerTenantId: string,
    @Param("id") id: string,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const row = await this.cancelUseCase.execute(tenantId, id);
    return toScheduledMessageDto(row);
  }
}
