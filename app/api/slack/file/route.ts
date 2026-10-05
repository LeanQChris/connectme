import { requireUserId, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * Proxy route for Slack private files.
 *
 * Slack file URLs (e.g. https://files.slack.com/files-pri/...) require an
 * Authorization Bearer token to download. Browsers cannot pass headers
 * to <img>, <video>, <audio>, or <a download> links, so this endpoint
 * securely proxies the request with the tenant's Slack bot token.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return Response.json({ error: "Invalid URL parameter" }, { status: 400 });
  }

  // Security check: Only allow Slack file / media domains to prevent SSRF
  const host = parsedUrl.hostname.toLowerCase();
  const isAllowedSlackHost =
    host === "files.slack.com" ||
    host.endsWith(".files.slack.com") ||
    host.endsWith(".slack.com") ||
    host.endsWith(".slack-edge.com") ||
    host.endsWith(".slack-msgs.com");

  if (!isAllowedSlackHost) {
    return Response.json({ error: "Forbidden target domain" }, { status: 403 });
  }

  // Retrieve tenant's Slack bot token
  const secrets = await tenantSecrets(auth.userId);
  const token = secrets.slackBotToken;
  if (!token) {
    return Response.json(
      { error: "Slack is not configured for this workspace" },
      { status: 400 }
    );
  }

  try {
    const slackRes = await fetch(parsedUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      redirect: "follow",
    });

    if (!slackRes.ok) {
      return new Response(
        `Failed to fetch file from Slack: ${slackRes.status} ${slackRes.statusText}`,
        { status: slackRes.status }
      );
    }

    const contentType =
      slackRes.headers.get("content-type") || "application/octet-stream";
    const contentLength = slackRes.headers.get("content-length");
    const customName = searchParams.get("name");
    const isDownload =
      searchParams.get("download") === "1" ||
      searchParams.get("download") === "true";

    let contentDisposition = slackRes.headers.get("content-disposition");
    if (customName && isDownload) {
      contentDisposition = `attachment; filename="${encodeURIComponent(customName)}"`;
    } else if (isDownload && !contentDisposition) {
      contentDisposition = "attachment";
    }

    const headers = new Headers();
    headers.set("content-type", contentType);
    if (contentLength) headers.set("content-length", contentLength);
    if (contentDisposition) headers.set("content-disposition", contentDisposition);
    headers.set("cache-control", "private, max-age=3600");

    return new Response(slackRes.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
