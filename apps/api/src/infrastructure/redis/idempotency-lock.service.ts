import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { RedisService } from "./redis.service";

/** Webhook providers redeliver for a long time; keep dedup keys well past that. */
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class IdempotencyLockService {
  private readonly logger = new Logger(IdempotencyLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Acquire a lock for the given identifier (e.g. wamid, mid, telegram update_id).
   * Returns true if lock was acquired (first time seeing this event), false if duplicate.
   *
   * Fails closed: if the shared store is unreachable we throw so the caller
   * rejects the request (and the provider retries) rather than risk processing
   * a duplicate on another replica.
   */
  async acquire(key: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<boolean> {
    const lockKey = `idemp:${key}`;
    try {
      const acquired = await this.redis.setNx(lockKey, "1", ttlSeconds);
      if (!acquired) {
        this.logger.debug(`Duplicate webhook or event detected for lock key: ${lockKey}`);
      }
      return acquired;
    } catch (err: any) {
      this.logger.error(`Idempotency store unavailable for ${lockKey}: ${err?.message}`);
      throw new ServiceUnavailableException(
        "Idempotency store temporarily unavailable; retry later.",
      );
    }
  }

  /**
   * Release a previously acquired lock so a failed event can be retried by the
   * provider instead of being permanently deduplicated.
   */
  async release(key: string): Promise<void> {
    try {
      await this.redis.del(`idemp:${key}`);
    } catch (err: any) {
      this.logger.warn(`Failed to release idempotency lock ${key}: ${err?.message}`);
    }
  }
}
