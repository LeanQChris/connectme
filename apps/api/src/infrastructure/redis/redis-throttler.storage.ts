import { Logger } from "@nestjs/common";
import { ThrottlerStorage, ThrottlerStorageService } from "@nestjs/throttler";
import { RedisService } from "./redis.service";

/**
 * Fixed-window counter executed atomically in Redis so rate limits are shared
 * across API replicas. Falls back to the in-process store if Redis is down so a
 * cache outage cannot take the whole API down.
 *
 * Returns `{ totalHits, timeToExpire, isBlocked, timeToBlockExpire }` in the
 * units @nestjs/throttler expects (seconds).
 */
const INCREMENT_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockPttl = redis.call('PTTL', blockKey)
if blockPttl and blockPttl > 0 then
  local total = tonumber(redis.call('GET', hitsKey) or '0')
  local blockSeconds = math.floor((blockPttl + 999) / 1000)
  return { total + 1, blockSeconds, 1, blockSeconds }
end

local total = redis.call('INCR', hitsKey)
if total == 1 then
  redis.call('PEXPIRE', hitsKey, ttl)
end
local hitsPttl = redis.call('PTTL', hitsKey)
if not hitsPttl or hitsPttl < 0 then hitsPttl = ttl end

local isBlocked = 0
local blockSeconds = 0
if blockDuration and blockDuration > 0 and total > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  isBlocked = 1
  blockSeconds = math.floor((blockDuration + 999) / 1000)
end

return { total, math.floor((hitsPttl + 999) / 1000), isBlocked, blockSeconds }
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly fallback = new ThrottlerStorageService();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitsKey}:block`;

    try {
      const raw = (await this.redis.eval(
        INCREMENT_SCRIPT,
        [hitsKey, blockKey],
        [ttl, limit, blockDuration || 0],
      )) as [number, number, number, number];

      return {
        totalHits: Number(raw[0]),
        timeToExpire: Number(raw[1]),
        isBlocked: Number(raw[2]) === 1,
        timeToBlockExpire: Number(raw[3]),
      };
    } catch (err: any) {
      this.logger.warn(
        `Rate-limit store unavailable (${err?.message}); using per-instance fallback.`,
      );
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }
}
