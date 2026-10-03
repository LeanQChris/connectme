import type { RedisOptions } from "ioredis";

/**
 * Resolve the Redis URL. `REDIS_URL` wins so credentials/TLS/`rediss://` are
 * preserved; host/port remain as a local-dev fallback.
 */
export function resolveRedisUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || "localhost";
  const port = process.env.REDIS_PORT || "6379";
  return `redis://${host}:${port}`;
}

/**
 * ioredis options for application clients. `enableOfflineQueue: false` makes
 * commands fail fast while the socket is down (callers decide the fallback)
 * instead of buffering and hanging. `retryStrategy` always returns a delay so
 * the client recovers after a Redis restart.
 */
export function buildRedisOptions(overrides: RedisOptions = {}): RedisOptions {
  return {
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 5000,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    ...overrides,
  };
}

/**
 * BullMQ connection options. Passing `url` lets BullMQ parse auth, db index,
 * TLS and `rediss://`; host/port are the fallback when `REDIS_URL` is unset.
 */
export function buildBullConnection(
  url = process.env.REDIS_URL,
  host = process.env.REDIS_HOST,
  port = process.env.REDIS_PORT,
): { url: string } | { host: string; port: number } {
  if (url) return { url };
  return {
    host: host || "localhost",
    port: parseInt(port || "6379", 10),
  };
}
