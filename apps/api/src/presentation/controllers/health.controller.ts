import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Public } from "../auth/public.decorator";

interface HealthStatus {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  checks: {
    database: "up" | "down";
  };
}

@Public()
@SkipThrottle()
@Controller("api/health")
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    let database: "up" | "down" = "up";
    try {
      await this.dataSource.query("SELECT 1");
    } catch {
      database = "down";
    }

    const status: HealthStatus = {
      status: database === "up" ? "ok" : "degraded",
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database },
    };

    if (database === "down") {
      throw new ServiceUnavailableException(status);
    }

    return status;
  }
}
