import type { Channel } from "../types";

/**
 * Resolve a media URL for display.
 *
 * Slack file URLs (files.slack.com) require an `Authorization` header, which a
 * browser cannot attach to `<img>`, `<video>`, `<audio>` or a download link.
 * Routing them through the API proxy fetches them with the tenant's bot token.
 * Everything else is returned untouched.
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  options?: { channel?: Channel | string; download?: boolean; name?: string | null },
): string {
  if (!url) return "";

  // Already a local proxy path or a relative asset.
  if (url.startsWith("/api/") || url.startsWith("/")) return url;

  const isSlackFile =
    options?.channel === "slack" ||
    url.includes("files.slack.com") ||
    url.includes("slack-edge.com") ||
    url.includes("slack-msgs.com");

  if (isSlackFile && /^https?:\/\//.test(url)) {
    const params = new URLSearchParams();
    params.set("url", url);
    if (options?.download) params.set("download", "1");
    if (options?.name) params.set("name", options.name);
    return `/api/media/slack?${params.toString()}`;
  }

  return url;
}