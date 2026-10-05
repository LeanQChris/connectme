/**
 * Fetching attachment bytes for providers that require an upload.
 *
 * Discord and Slack both need the file itself, not a link, so every outbound
 * attachment is pulled through here first. One shared helper so the size cap and
 * the error message are identical everywhere.
 */

import { MAX_UPLOAD_BYTES } from "./types";

export interface AttachmentBytes {
  url: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}

/** A safe, non-empty filename for provider uploads that require one. */
export function safeFilename(name: string | null | undefined, url: string, mimeType: string): string {
  const fromName = (name ?? "").trim().replace(/[^\w.\- ]+/g, "_").slice(0, 90);
  if (fromName) return fromName;

  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    if (last) return decodeURIComponent(last).replace(/[^\w.\- ]+/g, "_").slice(0, 90);
  } catch {
    // Relative or malformed URL; fall through to the extension.
  }

  const ext = (mimeType.split("/")[1] ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `attachment.${ext || "bin"}`;
}

export async function fetchAttachmentBytes(media: {
  url: string;
  name: string | null;
  mimeType: string;
}): Promise<AttachmentBytes> {
  const response = await fetch(media.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not read attachment (HTTP ${response.status})`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("Attachment is empty");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Attachment is larger than the upload limit");
  }

  return {
    url: media.url,
    filename: safeFilename(media.name, media.url, media.mimeType),
    mimeType: media.mimeType,
    bytes: buffer,
  };
}