import { formatMetaError } from "./verify";

/** Raised when the Graph API answers with a non-2xx status. */
export class MetaSendError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MetaSendError";
    this.status = status;
  }
}

/** Raised when a channel has no credentials configured yet. */
export class ChannelNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelNotConfiguredError";
  }
}

/**
 * POSTs JSON to the Graph API and returns the parsed body, throwing
 * MetaSendError with Meta's own error message on failure.
 */
export async function postGraphJson(
  url: string,
  accessToken: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // Never log the access token, only what Meta said.
    throw new MetaSendError(formatMetaError(payload), response.status);
  }

  return payload;
}