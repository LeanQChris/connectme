import crypto from "node:crypto";

/**
 * Verifies that an incoming webhook request from Slack is authentic
 * by verifying the X-Slack-Signature against the raw request body.
 *
 * Slack documentation: https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  signingSecret: string,
): boolean {
  if (!signature || !timestamp || !signingSecret) {
    return false;
  }

  // Prevent replay attacks: verify timestamp is within the last 5 minutes
  const ts = Number.parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret);
  hmac.update(sigBaseString);
  const digest = `v0=${hmac.digest("hex")}`;

  try {
    const signatureBuffer = Buffer.from(signature, "utf8");
    const digestBuffer = Buffer.from(digest, "utf8");

    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
  } catch {
    return false;
  }
}
