import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { IdempotencyLockService } from "./idempotency-lock.service";

/**
 * Shares a single Redis client across the app (idempotency, rate limiting,
 * pub/sub duplication). Global so feature/dynamic modules can inject it.
 */
@Global()
@Module({
  providers: [RedisService, IdempotencyLockService],
  exports: [RedisService, IdempotencyLockService],
})
export class RedisModule {}
