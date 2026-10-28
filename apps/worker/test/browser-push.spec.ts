import "reflect-metadata";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import { BrowserPushProcessor } from "../src/processors/browser-push.processor";
import { MessageDirection } from "@connectme/database";
import { validateVapidConfig } from "@connectme/crypto";
import { isBrowserPushEndpoint } from "@connectme/contracts";
import webpush = require("web-push");

test("push destinations reject internal, insecure and deceptive hosts", () => {
  for (const endpoint of ["http://fcm.googleapis.com/x", "https://localhost/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.attacker.test/x", "https://fcm.googleapis.com:444/x", "https://secret@fcm.googleapis.com/x"]) assert.equal(isBrowserPushEndpoint(endpoint), false);
  for (const endpoint of ["https://fcm.googleapis.com/fcm/send/test", "https://updates.push.services.mozilla.com/wpush/v2/test", "https://web.push.apple.com/test"]) assert.equal(isBrowserPushEndpoint(endpoint), true);
});

test("VAPID validation allows disabled push and rejects partial or mismatched keys", () => {
  validateVapidConfig({});
  assert.throws(() => validateVapidConfig({ VAPID_PUBLIC_KEY: "incomplete" }));
  const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
  const config = { VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString("base64url"), VAPID_PRIVATE_KEY: Buffer.from(ecdh.getPrivateKey().toString("hex").padStart(64, "0"), "hex").toString("base64url"), VAPID_SUBJECT: "mailto:admin@test.local" };
  validateVapidConfig(config);
  assert.throws(() => validateVapidConfig({ ...config, VAPID_PRIVATE_KEY: "a".repeat(43) }));
});

test("push delivery is membership-scoped, uses generic content, prunes expired endpoints and retries transient failures", async () => {
  const saved = { VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY, VAPID_SUBJECT: process.env.VAPID_SUBJECT };
  const keys = webpush.generateVAPIDKeys();
  const deviceKey = createECDH("prime256v1"); deviceKey.generateKeys();
  const browserSubscription = { endpoint: "https://fcm.googleapis.com/fake", keys: { p256dh: deviceKey.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
  Object.assign(process.env, { VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey, VAPID_SUBJECT: "mailto:test@test.local" });
  let disabledAt: Date | null = null;
  let status = 0;
  let sends = 0;
  let removed = 0;
  const sender = mock.method(webpush, "sendNotification", async (subscription: any, payload: string, options: any) => {
    const encrypted = webpush.generateRequestDetails(subscription, payload, options);
    assert.ok(encrypted.body && encrypted.body.length > 0);
    assert.ok(encrypted.headers.Authorization);
    sends++;
    assert.ok(!payload.includes("private customer text"));
    assert.equal(JSON.parse(payload).conversationId, "conv");
    if (status) throw { statusCode: status, endpoint: "do-not-log-this" };
    return {};
  });
  const processor = new BrowserPushProcessor({
    findOne: async (q: any) => { assert.deepEqual(q.where, { id: "device", tenantId: "tenant" }); return { user: { tenantId: "tenant", disabledAt }, vapidPublicKey: keys.publicKey, updatedAt: new Date(), subscriptionEnc: "ciphertext" }; },
    delete: async (q: any) => { assert.equal(q.tenantId, "tenant"); removed++; },
  } as any, { findOne: async (q: any) => { assert.equal(q.where.conversation.tenantId, "tenant"); return { direction: MessageDirection.INBOUND, createdAt: new Date(), conversationId: "conv", text: "private customer text" }; } } as any,
  { decryptStrict: () => browserSubscription } as any);
  const job = { data: { tenantId: "tenant", subscriptionId: "device", messageId: "msg" } } as any;
  try {
    await processor.process(job); assert.equal(sends, 1);
    disabledAt = new Date(); await processor.process(job); assert.equal(sends, 1);
    disabledAt = null; status = 410; await processor.process(job); assert.equal(removed, 1);
    status = 429; await assert.rejects(processor.process(job), /retrying/);
    status = 403; await assert.rejects(processor.process(job), /rejected \(403\)/);
  } finally {
    sender.mock.restore();
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
