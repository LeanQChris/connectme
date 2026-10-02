import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "./redis.service";

@Injectable()
export class IdempotencyLockService {
  private readonly logger = new Logger(IdempotencyLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Acquire a lock for the given identifier (e.g. wamid, mid, or telegram update_id).
   * Returns true if lock was acquired (first time seeing this event), false if duplicate.
   */
  async acquire(key: string, ttlSeconds = 120): Promise<boolean> {
    const lockKey = `idemp:${key}`;
    const acquired = await this.redis.setNx(lockKey, "1", ttlSeconds);
    if (!acquired) {
      this.logger.debug(`Duplicate webhook or event detected for lock key: ${lockKey}`);
    }
    return acquired;
  }

  async release(key: string): Promise<void> {
    const lockKey = `idemp:${key}`;
    await this.redis.del(lockKey);
  }
}
