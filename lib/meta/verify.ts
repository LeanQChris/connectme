import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Meta's X-Hub-Signature-256 header.
 *
 * Meta sends "sha256=" + HMAC-SHA256(rawBody, APP_SECRET) in hex. The raw body
 * must be read before JSON parsing, otherwise the bytes no longer match.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signatureHeader, "utf8");

  // timingSafeEqual throws when lengths differ, so compare lengths first.
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Constant-time string comparison, safe for unequal lengths. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Formats a Meta error payload as a single readable line. */
export function formatMetaError(error: unknown): string {
  if (!error || typeof error !== "object") return "Unknown error from Meta";
  const meta = error as {
    message?: string;
    error?: { message?: string };
    error_user_msg?: string;
  };
  return (
    meta.error?.message ?? meta.error_user_msg ?? meta.message ?? "Unknown error from Meta"
  );
}