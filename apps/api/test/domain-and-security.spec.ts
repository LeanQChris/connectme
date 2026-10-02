import "reflect-metadata";
import { test, describe } from "node:test";
import assert from "node:assert";
import { ChannelType } from "../src/domain/value-objects/channel.vo";
import { MessagingWindowVO } from "../src/domain/value-objects/messaging-window.vo";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { encryptPayload, decryptPayload, verifyHmacSha256, calculateHmacSha256 } from "@connectme/crypto";

describe("Domain Layer: MessagingWindowVO", () => {
  test("WhatsApp within 24 hours should be open", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const vo = new MessagingWindowVO(ChannelType.WHATSAPP, recent);
    const result = vo.calculate();

    assert.strictEqual(result.open, true);
    assert.ok(result.msRemaining! > 0);
  });

  test("WhatsApp after 25 hours should be closed", () => {
    const expired = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    const vo = new MessagingWindowVO(ChannelType.WHATSAPP, expired);
    const result = vo.calculate();

    assert.strictEqual(result.open, false);
    assert.strictEqual(result.msRemaining, 0);
  });

  test("Telegram should always have open window with null msRemaining", () => {
    const old = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000); // 50 days ago
    const vo = new MessagingWindowVO(ChannelType.TELEGRAM, old);
    const result = vo.calculate();

    assert.strictEqual(result.open, true);
    assert.strictEqual(result.msRemaining, null);
  });

  test("Discord should always have open window with null msRemaining", () => {
    const vo = new MessagingWindowVO(ChannelType.DISCORD, null);
    const result = vo.calculate();

    assert.strictEqual(result.open, true);
    assert.strictEqual(result.msRemaining, null);
  });
});

describe("Security & Crypto Layer", () => {
  test("AES-256-GCM encrypt and decrypt roundtrip", () => {
    const secretKey = "test-secret-key-32-chars-long!!";
    const payload = { accessToken: "EAAB...", tenantId: "tenant-123" };

    const encrypted = encryptPayload(payload, secretKey);
    assert.ok(encrypted.startsWith("v2."));

    const decrypted = decryptPayload<typeof payload>(encrypted, secretKey);
    assert.deepStrictEqual(decrypted, payload);
  });

  test("AES-256-GCM uses a random salt per message", () => {
    const secretKey = "test-secret-key-32-chars-long!!";
    const a = encryptPayload("same", secretKey);
    const b = encryptPayload("same", secretKey);
    assert.notStrictEqual(a, b);
    assert.strictEqual(decryptPayload<string>(a, secretKey), "same");
    assert.strictEqual(decryptPayload<string>(b, secretKey), "same");
  });

  test("decrypts legacy v1 ciphertext (static salt)", () => {
    const secretKey = "test-secret-key-32-chars-long!!";
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", scryptSync(secretKey, "connectme-secrets", 32), iv);
    const body = Buffer.concat([cipher.update("legacy", "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const legacy = ["v1", iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");

    assert.strictEqual(decryptPayload<string>(legacy, secretKey), "legacy");
  });

  test("HMAC-SHA256 signature verification succeeds on authentic payload", () => {
    const secret = "app-secret-12345";
    const body = JSON.stringify({ entry: [] });
    const sig = `sha256=${calculateHmacSha256(body, secret)}`;

    const valid = verifyHmacSha256(body, secret, sig);
    assert.strictEqual(valid, true);
  });

  test("HMAC-SHA256 signature verification fails on tampered payload", () => {
    const secret = "app-secret-12345";
    const body = JSON.stringify({ entry: [] });
    const tampered = JSON.stringify({ entry: [{ evil: true }] });
    const sig = `sha256=${calculateHmacSha256(body, secret)}`;

    const valid = verifyHmacSha256(tampered, secret, sig);
    assert.strictEqual(valid, false);
  });
});
