import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { Public } from "../auth/public.decorator";

/**
 * How long a dependency probe may take before readiness reports it down.
 * Without a bound, a wedged connection leaves the probe hanging rather than
 * failing fast, which stalls the orchestrator's readiness rollout.
 */
const PROBE_TIMEOUT_MS = 2_000;

type CheckState = "up" | "down";

interface LivenessStatus {
  status: "ok";
  uptimeSeconds: number;
}

interface ReadinessStatus {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  checks: {
    database: CheckState;
    redis: CheckState;
  };
}

/**
 * Rejects if `promise` has not settled within {@link PROBE_TIMEOUT_MS}. The
 * underlying operation is not cancelled — it is abandoned, because a probe has
 * no meaningful side effect to interrupt.
 */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("probe timed out")), PROBE_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
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

  /**
   * Liveness. Touches no dependency on purpose: this answers "is this process
   * still running?", and pointing a restart policy at a dependency check turns a
   * database blip into a restart loop of otherwise-healthy instances.
   */
  @Get("live")
  live(): LivenessStatus {
    return { status: "ok", uptimeSeconds: Math.round(process.uptime()) };
  }

  /**
   * Readiness. Answers "should this instance receive traffic?", so it reports
   * dependency state and fails with 503 when the instance cannot serve.
   */
  @Get("ready")
  async ready(): Promise<ReadinessStatus> {
    const database = await this.probeDatabase();
    const redis = await this.probeRedis();

    const status: ReadinessStatus = {
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

  /**
   * Backwards-compatible alias for {@link ready}, retained so an existing
   * deployment's probe keeps its current meaning. Configure liveness against
   * `/api/health/live` — do not point a restart policy at this route.
   */
  @Get()
  async check(): Promise<ReadinessStatus> {
    return this.ready();
  }

  private async probeDatabase(): Promise<CheckState> {
    try {
      await withTimeout(this.dataSource.query("SELECT 1"));
      return "up";
    } catch {
      return "down";
    }
  }

  private async probeRedis(): Promise<CheckState> {
    try {
      return (await withTimeout(this.redis.ping())) ? "up" : "down";
    } catch {
      return "down";
    }
  }
}
