import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { Public } from "../auth/public.decorator";

interface HealthStatus {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  checks: {
    database: "up" | "down";
    redis: "up" | "down";
  };
}

@Public()
@SkipThrottle()
@Controller("api/health")
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(RedisService)
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    let database: "up" | "down" = "up";
    try {
      await this.dataSource.query("SELECT 1");
    } catch {
      database = "down";
    }

    let redis: "up" | "down" = "up";
    try {
      if (!(await this.redis.ping())) redis = "down";
    } catch {
      redis = "down";
    }

    const status: HealthStatus = {
      status: database === "up" && redis === "up" ? "ok" : "degraded",
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database, redis },
    };

    // Only the database is treated as fatal; Redis degradation is reported but
    // does not pull the instance out of rotation.
    if (database === "down") {
      throw new ServiceUnavailableException(status);
    }

    return status;
  }
}
