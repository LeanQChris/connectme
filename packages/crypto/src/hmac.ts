import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a timing-safe HMAC-SHA256 signature (e.g. Meta X-Hub-Signature-256).
 */
export function verifyHmacSha256(
  payloadRaw: string | Buffer,
  secret: string,
  expectedSignatureHeader: string,
): boolean {
  if (!payloadRaw || !secret || !expectedSignatureHeader) return false;

  // Header is usually in form "sha256=<hex>"
  const sigPart = expectedSignatureHeader.startsWith("sha256=")
    ? expectedSignatureHeader.slice(7)
    : expectedSignatureHeader;

  if (!/^[0-9a-f]{64}$/i.test(sigPart)) return false;

  const expectedBuffer = Buffer.from(sigPart, "hex");
  const computedHex = createHmac("sha256", secret).update(payloadRaw).digest("hex");
  const computedBuffer = Buffer.from(computedHex, "hex");

  if (expectedBuffer.length !== computedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, computedBuffer);
}

/**
 * Calculate HMAC-SHA256 hex string.
 */
export function calculateHmacSha256(payloadRaw: string | Buffer, secret: string): string {
  return createHmac("sha256", secret).update(payloadRaw).digest("hex");
}

/** Constant-time comparison for two secret strings. */
export function timingSafeEqualString(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
