/** The contract's MediaKind members (see packages/contracts/src/messages.ts). */
const MEDIA_KINDS = new Set(["image", "audio", "video", "document", "sticker", "location", "file"]);

/**
 * Narrow a stored MessageType to the contract's MediaKind.
 *
 * Message types and media kinds overlap but are not the same set — TEXT and
 * OTHER have no media-kind equivalent — so anything unrecognised degrades to
 * `file` rather than emitting a value zod would reject.
 */
export function mediaKindFor(type: string): string {
  const kind = String(type).toLowerCase();
  return MEDIA_KINDS.has(kind) ? kind : "file";
}
