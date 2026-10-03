import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { buildRedisOptions, resolveRedisUrl } from "./redis-options";

/**
 * Thin ioredis wrapper. There is deliberately no in-memory fallback: idempotency
 * locks MUST be shared across API replicas, so a silently-degraded local store
 * would let duplicate webhooks through. Callers fail closed when Redis is down.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private ready = false;

  constructor() {
    this.client = new Redis(resolveRedisUrl(), buildRedisOptions());

    // ioredis emits "error" on connection loss; without a listener an
    // EventEmitter throws and crashes the process.
    this.client.on("error", (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
    this.client.on("ready", () => {
      this.ready = true;
      this.logger.log("Redis connection ready.");
    });
    this.client.on("close", () => {
      this.ready = false;
    });
    this.client.on("end", () => {
      this.ready = false;
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis initial connect failed: ${err.message}`);
    });
  }

  isReady(): boolean {
    return this.ready && this.client.status === "ready";
  }

  /** Duplicate the connection (ioredis copies options) e.g. for pub/sub. */
  duplicate(): Redis {
    return this.client.duplicate();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return res === "OK";
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Set a value only if the key is absent; returns true when written. */
  async setNxValue(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return res === "OK";
  }

  async eval(
    script: string,
    keys: string[],
    args: (string | number)[] = [],
  ): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args);
  }

  async ping(): Promise<boolean> {
    const res = await this.client.ping();
    return res === "PONG";
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
