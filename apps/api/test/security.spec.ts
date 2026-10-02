import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, createHash } from "node:crypto";
import { verifyDiscordSignature } from "@connectme/crypto";
import { encodeOAuthState, decodeOAuthState } from "../src/infrastructure/security/oauth-state";
import { isAllowedMediaHost } from "../src/infrastructure/security/allowed-media-hosts";

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "test-encryption-key-0123456789abcdef";

describe("OAuth state", () => {
  test("round-trips a signed payload", () => {
    const state = encodeOAuthState({
      t: "tenant_1",
      n: "nonce",
      v: "verifier",
      exp: Date.now() + 60_000,
    });
    const decoded = decodeOAuthState(state);
    assert.equal(decoded?.t, "tenant_1");
    assert.equal(decoded?.v, "verifier");
  });

  test("rejects a tampered payload", () => {
    const state = encodeOAuthState({
      t: "tenant_1",
      n: "nonce",
      v: "verifier",
      exp: Date.now() + 60_000,
    });
    const [payload, sig] = state.split(".");
    const forged = Buffer.from(
      JSON.stringify({ t: "tenant_victim", n: "nonce", v: "verifier", exp: Date.now() + 60_000 }),
    ).toString("base64url");
    assert.equal(decodeOAuthState(`${forged}.${sig}`), null);
  });

  test("rejects an expired payload", () => {
    const state = encodeOAuthState({
      t: "tenant_1",
      n: "nonce",
      v: "verifier",
      exp: Date.now() - 1000,
    });
    assert.equal(decodeOAuthState(state), null);
  });

  test("rejects a malformed state", () => {
    assert.equal(decodeOAuthState("not-a-state"), null);
    assert.equal(decodeOAuthState(""), null);
  });
});

describe("Discord signature verification", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spki = publicKey.export({ format: "der", type: "spki" });
  const publicKeyHex = spki.subarray(spki.length - 32).toString("hex");

  test("accepts a valid signature", () => {
    const timestamp = "1700000000";
    const body = Buffer.from(JSON.stringify({ type: 1 }));
    const signature = sign(null, Buffer.concat([Buffer.from(timestamp), body]), privateKey).toString(
      "hex",
    );
    assert.equal(verifyDiscordSignature(body, timestamp, signature, publicKeyHex), true);
  });

  test("rejects a tampered body", () => {
    const timestamp = "1700000000";
    const body = Buffer.from(JSON.stringify({ type: 1 }));
    const signature = sign(null, Buffer.concat([Buffer.from(timestamp), body]), privateKey).toString(
      "hex",
    );
    assert.equal(
      verifyDiscordSignature(Buffer.from('{"type":2}'), timestamp, signature, publicKeyHex),
      false,
    );
  });

  test("rejects a bad public key", () => {
    assert.equal(verifyDiscordSignature("body", "1", "00", "zz"), false);
  });
});

describe("Media host allowlist (SSRF)", () => {
  test("allows Meta/Graph media hosts", () => {
    assert.equal(isAllowedMediaHost("https://graph.facebook.com/v22.0/123"), true);
    assert.equal(
      isAllowedMediaHost("https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1"),
      true,
    );
    assert.equal(isAllowedMediaHost("https://scontent.xx.fbcdn.net/v/t1.0-9/x.jpg"), true);
  });

  test("blocks internal and non-https hosts", () => {
    assert.equal(isAllowedMediaHost("http://169.254.169.254/latest/meta-data/"), false);
    assert.equal(isAllowedMediaHost("http://localhost:4000/api"), false);
    assert.equal(isAllowedMediaHost("https://127.0.0.1/"), false);
    assert.equal(isAllowedMediaHost("https://10.0.0.5/"), false);
    assert.equal(isAllowedMediaHost("https://192.168.1.1/"), false);
    assert.equal(isAllowedMediaHost("https://internal.example.com/"), false);
    assert.equal(isAllowedMediaHost("not-a-url"), false);
  });

  test("allows a configured object store host", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example-bucket.com";
    assert.equal(isAllowedMediaHost("https://cdn.example-bucket.com/a.jpg"), true);
    delete process.env.S3_PUBLIC_BASE_URL;
  });
});
