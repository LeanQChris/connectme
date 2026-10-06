import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ensureWebhookVerifyToken } from "../src/presentation/webhook-verify-token";

/**
 * The webhook handler rejects an inbound update when the tenant has no stored
 * token, so the value shown in settings, the value sent to Telegram and the
 * value checked per request have to be the same persisted token. Previously a
 * hardcoded default was displayed and registered but never stored, which left
 * Telegram unable to deliver anything.
 */
function fakeRepo(initial?: string | null) {
  const calls: Array<{ tenantId: string; partial: Record<string, unknown> }> = [];
  let stored = initial ?? null;

  return {
    calls,
    get stored() {
      return stored;
    },
    repo: {
      updateCredentials: async (tenantId: string, partial: Record<string, unknown>) => {
        calls.push({ tenantId, partial });
        stored = String(partial.webhookVerifyToken);
        return { webhookVerifyToken: stored };
      },
    } as any,
  };
}

test("keeps an existing token and never writes", async () => {
  const fake = fakeRepo("existing-token");

  const token = await ensureWebhookVerifyToken(fake.repo, "t1", "existing-token");

  assert.equal(token, "existing-token");
  assert.equal(fake.calls.length, 0, "must not rotate a configured token");
});

test("mints and persists a token when none is stored", async () => {
  const fake = fakeRepo(null);

  const token = await ensureWebhookVerifyToken(fake.repo, "t1", null);

  assert.match(token, /^[0-9a-f]{48}$/, "expected 24 random bytes as hex");
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].tenantId, "t1");
  assert.equal(fake.stored, token, "the persisted value must be what was returned");
});

test("treats an empty string as unconfigured", async () => {
  const fake = fakeRepo(null);

  const token = await ensureWebhookVerifyToken(fake.repo, "t1", "");

  assert.notEqual(token, "", "an empty token would be rejected on every request");
  assert.equal(fake.stored, token);
});

test("is idempotent: a second call returns the persisted token", async () => {
  const fake = fakeRepo(null);

  const first = await ensureWebhookVerifyToken(fake.repo, "t1", null);
  // Simulate the credentials row now holding the minted token.
  const second = await ensureWebhookVerifyToken(fake.repo, "t1", fake.stored);

  assert.equal(first, second);
  assert.equal(fake.calls.length, 1, "only the first call should mint");
});
