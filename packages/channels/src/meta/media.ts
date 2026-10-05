import { fetchWithTimeout } from "../http";
import { graphUrl } from "./graph";

const MEDIA_TIMEOUT_MS = 30_000;

function stripCharset(contentType: string | null): string | null {
  if (!contentType) return null;
  const value = contentType.split(";")[0]?.trim();
  return value || null;
}

export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string,
): Promise<{ buffer: Buffer; mimeType: string | null }> {
  const metaRes = await fetchWithTimeout(
    graphUrl(mediaId),
    { headers: { Authorization: `Bearer ${accessToken}` } },
    MEDIA_TIMEOUT_MS,
  );
  if (!metaRes.ok) {
    throw new Error(`Failed to resolve WhatsApp media ${mediaId} (HTTP ${metaRes.status}).`);
  }

  const meta = (await metaRes.json().catch(() => ({}))) as {
    url?: string;
    mime_type?: string;
  };
  if (!meta.url) {
    throw new Error(`WhatsApp media ${mediaId} did not return a download URL.`);
  }

  const bytesRes = await fetchWithTimeout(
    meta.url,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    MEDIA_TIMEOUT_MS,
  );
  if (!bytesRes.ok) {
    throw new Error(`Failed to download WhatsApp media ${mediaId} (HTTP ${bytesRes.status}).`);
  }

  const buffer = Buffer.from(await bytesRes.arrayBuffer());
  const headerMime = stripCharset(bytesRes.headers.get("content-type"));
  const mimeType = stripCharset(meta.mime_type ?? null) ?? headerMime;
  return { buffer, mimeType };
}

export async function downloadRemoteMedia(
  url: string,
): Promise<{ buffer: Buffer; mimeType: string | null }> {
  const res = await fetchWithTimeout(url, {}, MEDIA_TIMEOUT_MS);
  if (!res.ok) {
    throw new Error(`Failed to download media from ${url} (HTTP ${res.status}).`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType: stripCharset(res.headers.get("content-type")) };
}
