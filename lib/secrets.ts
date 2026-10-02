/**
 * Provider credentials, encrypted at rest.
 *
 * Each tenant owns their Meta/Telegram tokens. They are stored as one AES-256-GCM
 * blob per tenant, keyed by ENCRYPTION_KEY, so a store dump never yields usable
 * tokens. The identifiers used to route webhooks (phone number id, page id, bot
 * id) stay in plaintext because they are not secrets and must be looked up.
 *
 * Server-only: imports node:crypto.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { config } from "./config";
import type { ProviderSecrets } from "./types";

const ALGO = "aes-256-gcm";
const PREFIX = "v1";

function key(): Buffer {
  return scryptSync(config.encryptionKey, "connectme-secrets", 32);
}

export function encryptSecrets(secrets: ProviderSecrets): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(secrets), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptSecrets(payload: string): ProviderSecrets | null {
  const [version, ivRaw, tagRaw, bodyRaw] = payload.split(".");
  if (version !== PREFIX || !ivRaw || !tagRaw || !bodyRaw) return null;

  try {
    const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(bodyRaw, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString("utf8")) as ProviderSecrets;
  } catch {
    // Wrong master key or tampered blob.
    return null;
  }
}

/** Telegram tokens look like `<botId>:<secret>`; the bot id is a public router key. */
export function telegramBotId(token: string): string | null {
  const id = token.split(":")[0]?.trim();
  return id && /^\d+$/.test(id) ? id : null;
}
