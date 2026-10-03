import { Controller, Get, Query } from "@nestjs/common";
import { DashboardStatsDto } from "@connectme/contracts";
import { GetDashboardStatsUseCase } from "../../application/use-cases/stats/get-dashboard-stats.use-case";
import { TenantId } from "../auth/tenant-id.decorator";
import { clampLimit } from "../validation/parse";

@Controller("api/stats")
export class StatsController {
  constructor(private readonly dashboardStats: GetDashboardStatsUseCase) {}

  @Get()
  async dashboard(
    @TenantId() tenantId: string,
    @Query("days") days?: string,
  ): Promise<DashboardStatsDto> {
    return this.dashboardStats.execute(tenantId, clampLimit(days, 14, 90));
  }
}