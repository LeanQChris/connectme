import type { RedisOptions } from "ioredis";

/** `REDIS_URL` wins so auth/TLS/`rediss://` survive; host/port are fallbacks. */
export function resolveRedisUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || "localhost";
  const port = process.env.REDIS_PORT || "6379";
  return `redis://${host}:${port}`;
}

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
