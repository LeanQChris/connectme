import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { InjectDataSource } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { DataSource } from "typeorm";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import {
  AI_AGENT_QUEUE,
  INBOUND_WEBHOOKS_QUEUE,
  MEDIA_REHOST_QUEUE,
  OUTBOUND_RETRY_QUEUE,
  OUTBOUND_SCHEDULER_QUEUE,
} from "../queue.constants";

type RedisPingable = { ping(): Promise<string> };

@Injectable()
export class WorkerHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerHealthService.name);
  private server?: Server;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue(INBOUND_WEBHOOKS_QUEUE) private readonly inboundQueue: Queue,
    @InjectQueue(OUTBOUND_SCHEDULER_QUEUE) private readonly schedulerQueue: Queue,
    @InjectQueue(AI_AGENT_QUEUE) private readonly aiQueue: Queue,
    @InjectQueue(MEDIA_REHOST_QUEUE) private readonly mediaQueue: Queue,
    @InjectQueue(OUTBOUND_RETRY_QUEUE) private readonly retryQueue: Queue,
  ) {}

  onModuleInit(): void {
    const port = Number(process.env.WORKER_HEALTH_PORT) || 4100;

    this.server = createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    this.server.on("error", (err) => {
      this.logger.error(`Health server error: ${err.message}`);
    });

    this.server.listen(port, "0.0.0.0", () => {
      this.logger.log(`Worker health server listening on http://0.0.0.0:${port}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve) => {
      this.server!.close(() => resolve());
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const path = (req.url || "/").split("?")[0];
      if (req.method !== "GET") {
        this.sendJson(res, 404, { error: "Not Found" });
        return;
      }
      if (path === "/health") {
        await this.handleHealth(res);
      } else if (path === "/metrics") {
        await this.handleMetrics(res);
      } else {
        this.sendJson(res, 404, { error: "Not Found" });
      }
    } catch (err) {
      this.logger.error(`Health request failed: ${(err as Error).message}`);
      this.sendJson(res, 500, { error: (err as Error).message || "Internal Server Error" });
    }
  }

  private async handleHealth(res: ServerResponse): Promise<void> {
    const checks = { database: "up", redis: "up" };
    let error: string | undefined;

    try {
      await this.dataSource.query("SELECT 1");
    } catch (err) {
      checks.database = "down";
      error = `database: ${(err as Error).message}`;
    }

    try {
      const client = (await this.inboundQueue.client) as unknown as RedisPingable;
      await client.ping();
    } catch (err) {
      checks.redis = "down";
      error = error ? `${error}; redis: ${(err as Error).message}` : `redis: ${(err as Error).message}`;
    }

    const healthy = checks.database === "up" && checks.redis === "up";
    this.sendJson(res, healthy ? 200 : 503, {
      status: healthy ? "ok" : "error",
      uptime: process.uptime(),
      checks,
      ...(error ? { error } : {}),
    });
  }

  private async handleMetrics(res: ServerResponse): Promise<void> {
    const queues: Array<{ name: string; queue: Queue }> = [
      { name: INBOUND_WEBHOOKS_QUEUE, queue: this.inboundQueue },
      { name: OUTBOUND_SCHEDULER_QUEUE, queue: this.schedulerQueue },
      { name: AI_AGENT_QUEUE, queue: this.aiQueue },
      { name: MEDIA_REHOST_QUEUE, queue: this.mediaQueue },
      { name: OUTBOUND_RETRY_QUEUE, queue: this.retryQueue },
    ];

    const counts: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};

    for (const { name, queue } of queues) {
      const jobCounts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      );
      counts[name] = jobCounts;
      for (const [state, value] of Object.entries(jobCounts)) {
        totals[state] = (totals[state] || 0) + value;
      }
    }

    this.sendJson(res, 200, { queues: counts, totals });
  }

  private sendJson(res: ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    });
    res.end(payload);
  }
}
