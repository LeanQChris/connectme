export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Core HTTP Client for communicating with the NestJS backend API.
 */
export async function httpClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  // Relative /api/* requests are routed through the Next proxy, which injects
  // the Clerk bearer token. Absolute URLs bypass the proxy and are unauthenticated.
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.set(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {};
  if (!(restOptions.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorJson.message || `API request failed with HTTP ${response.status}`,
      errorJson,
    );
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return response.json();
}
