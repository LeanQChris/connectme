import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "v1";

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "connectme-secrets", 32);
}

/**
 * Encrypt arbitrary JSON serializable payload or string with AES-256-GCM.
 */
export function encryptPayload(payload: unknown, secretKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(secretKey), iv);
  const jsonStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const body = Buffer.concat([
    cipher.update(jsonStr, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");
}

/**
 * Decrypt an AES-256-GCM blob formatted as v1.iv.tag.body.
 */
export function decryptPayload<T = unknown>(encryptedBlob: string, secretKey: string): T | null {
  const [version, ivRaw, tagRaw, bodyRaw] = encryptedBlob.split(".");
  if (version !== PREFIX || !ivRaw || !tagRaw || !bodyRaw) return null;

  try {
    const decipher = createDecipheriv(ALGO, deriveKey(secretKey), Buffer.from(ivRaw, "base64url"));
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
