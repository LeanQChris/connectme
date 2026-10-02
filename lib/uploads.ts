/**
 * Local file storage for outbound attachments.
 *
 * Uploads live on disk next to the JSON store. That is fine for a single Node
 * instance; on a serverless host the filesystem is per-instance and ephemeral,
 * so a media proxy such as S3/R2 should replace these two functions.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { MAX_UPLOAD_BYTES, type MessageType, type UploadedMedia } from "./types";

const DIR = path.join(process.cwd(), "data", "uploads");

const SAFE_NAME = /^[0-9a-f-]{36}\.[a-z0-9]{1,8}$/;

export function kindForMime(mimeType: string): MessageType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export async function saveUpload(file: File): Promise<UploadedMedia> {
  if (file.size === 0) throw new Error("Empty file");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large (maximum ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`);
  }

  const mimeType = file.type || "application/octet-stream";
  const ext = (mimeType.split("/")[1] ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const name = `${randomUUID()}.${ext || "bin"}`;

  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));

  return {
    url: `/api/media?file=${name}`,
    type: kindForMime(mimeType),
    mimeType,
    name: file.name || name,
    size: file.size,
  };
}

export async function readUpload(file: string): Promise<{ body: Buffer; mimeType: string } | null> {
  if (!SAFE_NAME.test(file)) return null;
  try {
    const body = await readFile(path.join(DIR, file));
    const mimeType = mimeForExt(file.split(".")[1] ?? "");
    return { body, mimeType };
  } catch {
    return null;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
};

function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}