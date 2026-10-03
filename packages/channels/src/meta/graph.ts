export function graphVersion(): string {
  return (
    process.env.META_GRAPH_VERSION ||
    process.env.NEXT_PUBLIC_META_GRAPH_VERSION ||
    "v22.0"
  );
}

export function graphUrl(path: string): string {
  return `https://graph.facebook.com/${graphVersion()}/${path}`;
}

export function toMetaMediaType(mimeType?: string | null, fallback = "file"): string {
  if (!mimeType) return fallback;
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}
