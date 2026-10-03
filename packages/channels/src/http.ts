export const DEFAULT_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 2;
export const MAX_RETRY_DELAY_MS = 30_000;

export class ChannelHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ChannelHttpError";
  }
}

/** Parse a `Retry-After` header (seconds or HTTP date) into milliseconds. */
export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, Math.min(date - Date.now(), MAX_RETRY_DELAY_MS));
  return undefined;
}

/**
 * Provider-aware retry: retries 429 and 5xx responses (honoring `Retry-After`)
 * and network/timeouts, with bounded exponential backoff. A hung provider can
 * no longer stall a worker: every attempt has an abort timeout.
 */
export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit = {},
  options: { retries?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const retries = options.retries ?? MAX_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const method = (init.method || "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";

  let lastError: unknown;
  for (let attempt = 0; attempt <= (idempotent ? retries : 0); attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (attempt < retries) {
          const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
          const delay = retryAfter ?? Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      return response;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS)));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Channel request failed");
}

/** Single-shot fetch with an abort timeout (kept for compatibility). */
export function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const signal = init.signal ?? AbortSignal.timeout(timeoutMs);
  return fetch(input, { ...init, signal });
}
