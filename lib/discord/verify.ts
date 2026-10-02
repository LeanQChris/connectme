import crypto from "node:crypto";

/**
 * Verifies the Ed25519 signature sent by Discord on interactions.
 * Discord sends:
 *  - X-Signature-Ed25519: hex-encoded Ed25519 signature
 *  - X-Signature-Timestamp: timestamp string
 * 
 * Signature is computed over: timestamp + rawBody
 */
export function verifyDiscordSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string
): boolean {
  if (!signature || !timestamp || !publicKeyHex) return false;

  try {
    const cleanKey = publicKeyHex.trim();
    if (cleanKey.length !== 64) return false;

    // Wrap raw 32-byte Ed25519 public key in ASN.1 SPKI DER header (12 bytes prefix)
    const spki = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      Buffer.from(cleanKey, "hex"),
    ]);

    const key = crypto.createPublicKey({
      key: spki,
      format: "der",
      type: "spki",
    });

    const data = Buffer.from(timestamp + rawBody);
    const sig = Buffer.from(signature, "hex");

    return crypto.verify(null, data, key, sig);
  } catch (err) {
    console.error("[discord verify signature error]", err);
    return false;
  }
}
