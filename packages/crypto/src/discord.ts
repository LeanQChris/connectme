import { createPublicKey, verify as verifySignature } from "node:crypto";

// SPKI DER prefix for a raw 32-byte Ed25519 public key.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Verify a Discord interaction signature (Ed25519 over `timestamp + rawBody`).
 * `publicKeyHex` is the application's public key from the Discord developer
 * portal (64 hex characters).
 */
export function verifyDiscordSignature(
  rawBody: Buffer | string,
  timestamp: string,
  signatureHex: string,
  publicKeyHex: string,
): boolean {
  try {
    if (!rawBody || !timestamp || !signatureHex || !publicKeyHex) return false;

    const rawKey = Buffer.from(publicKeyHex, "hex");
    if (rawKey.length !== 32) return false;

    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawKey]),
      format: "der",
      type: "spki",
    });

    const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const message = Buffer.concat([Buffer.from(timestamp, "utf8"), body]);
    const signature = Buffer.from(signatureHex, "hex");

    return verifySignature(null, message, publicKey, signature);
  } catch {
    return false;
  }
}
