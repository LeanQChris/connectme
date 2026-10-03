import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "v2";
const LEGACY_PREFIX = "v1";
const LEGACY_SALT = "connectme-secrets";
const SALT_BYTES = 16;
const MIN_SECRET_LENGTH = 32;

export class CryptoDecryptError extends Error {
  constructor(message = "Ciphertext could not be decrypted with the provided key.") {
    super(message);
    this.name = "CryptoDecryptError";
  }
}

function assertSecret(secretKey: string): void {
  if (!secretKey || secretKey.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Encryption key must be at least ${MIN_SECRET_LENGTH} characters. Generate one with \`openssl rand -hex 32\`.`,
    );
  }
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32);
}

/**
 * Encrypt arbitrary JSON serializable payload or string with AES-256-GCM.
 * Format: v2.<salt>.<iv>.<tag>.<body> (base64url); a random per-message salt is
 * used so the same plaintext never derives the same key.
 */
export function encryptPayload(payload: unknown, secretKey: string): string {
  assertSecret(secretKey);
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(secretKey, salt), iv);
  const jsonStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const body = Buffer.concat([
    cipher.update(jsonStr, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    salt.toString("base64url"),
    iv.toString("base64url"),
    tag.toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}

/**
 * Decrypt an AES-256-GCM blob. Supports both the current `v2` format (random
 * per-message salt) and the legacy `v1` format (static salt) so existing
 * ciphertext keeps decrypting.
 */
export function decryptPayload<T = unknown>(encryptedBlob: string, secretKey: string): T | null {
  assertSecret(secretKey);
  const parts = encryptedBlob.split(".");
  const version = parts[0];

  let salt: Buffer;
  let ivRaw: string;
  let tagRaw: string;
  let bodyRaw: string;

  if (version === PREFIX) {
    if (parts.length !== 5) return null;
    const [, saltRaw, iv, tag, body] = parts;
    salt = Buffer.from(saltRaw, "base64url");
    ivRaw = iv;
    tagRaw = tag;
    bodyRaw = body;
  } else if (version === LEGACY_PREFIX) {
    if (parts.length !== 4) return null;
    const [, iv, tag, body] = parts;
    salt = Buffer.from(LEGACY_SALT, "utf8");
    ivRaw = iv;
    tagRaw = tag;
    bodyRaw = body;
  } else {
    return null;
  }

  if (!ivRaw || !tagRaw || !bodyRaw) return null;

  try {
    const decipher = createDecipheriv(ALGO, deriveKey(secretKey, salt), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(bodyRaw, "base64url")),
      decipher.final(),
    ]);
    const plainText = plain.toString("utf8");
    try {
      return JSON.parse(plainText) as T;
    } catch {
      return plainText as unknown as T;
    }
  } catch {
    return null;
  }
}

/**
 * Strict variant: throws {@link CryptoDecryptError} instead of returning null,
 * so callers never fall back to forwarding ciphertext to a provider.
 */
export function decryptPayloadStrict<T = unknown>(encryptedBlob: string, secretKey: string): T {
  const value = decryptPayload<T>(encryptedBlob, secretKey);
  if (value === null || value === undefined) {
    throw new CryptoDecryptError();
  }
  return value;
}
