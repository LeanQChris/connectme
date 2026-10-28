import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { Queue } from "bullmq";
import type { Request } from "express";
import type { AesVaultService } from "@connectme/channels";
import type { ITenantRepository } from "../src/domain/repositories/i-tenant.repository";
import { WebhookController } from "../src/presentation/controllers/webhook.controller";

test("verified webhooks enqueue in real Redis, deduplicate retries, and preserve provider scope and status changes", async (t) => {
  if (!process.env.REDIS_URL) return t.skip("Set REDIS_URL for the isolated webhook queue check.");
  const url = new URL(process.env.REDIS_URL);
  const queue = new Queue(`webhook-check-${randomUUID()}`, { connection: { host: url.hostname, port: Number(url.port) || 6379, username: url.username || undefined, password: url.password || undefined, ...(url.protocol === "rediss:" ? { tls: {} } : {}), maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 2000 } });
  const originalSecret = process.env.META_APP_SECRET;
  const repo = {
    findAccountByExternalId: async () => ({ tenantId: "tenant1" }),
    getCredentials: async () => ({ webhookVerifyToken: "telegram-secret", slackSigningSecretEnc: "encrypted" }),
  } as unknown as ITenantRepository;
  const controller = new WebhookController(repo, queue, { decrypt: () => "slack-secret" } as unknown as AesVaultService);
  try {
    const body = { type: "event_callback", team_id: "T1", event_id: "Ev1" }; const raw = JSON.stringify(body);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `v0=${createHmac("sha256", "slack-secret").update(`v0:${timestamp}:${raw}`).digest("hex")}`;
    const request = { rawBody: Buffer.from(raw) } as Request;
    await controller.handleSlackWebhook(request, signature, timestamp, body);
    await controller.handleSlackWebhook(request, signature, timestamp, body);
    assert.equal(await queue.getWaitingCount(), 1, "a verified Slack retry must collapse to the first job");
    await controller.handleTelegramWebhook("botA", "telegram-secret", { update_id: 42 });
    await controller.handleTelegramWebhook("botB", "telegram-secret", { update_id: 42 });
    await controller.handleTelegramWebhook("botA", "telegram-secret", { update_id: 42 });
    assert.equal(await queue.getWaitingCount(), 3, "the same update_id from two bots must preserve both events");
    process.env.META_APP_SECRET = "meta-secret";
    for (const status of ["delivered", "read", "read"]) {
      const payload = { object: "whatsapp_business_account", entry: [{ id: "entry", changes: [{ value: { statuses: [{ id: "message-1", status, timestamp: "12345" }] } }] }] };
      const bytes = JSON.stringify(payload);
      const metaSignature = `sha256=${createHmac("sha256", "meta-secret").update(bytes).digest("hex")}`;
      await controller.handleMetaWebhook({ rawBody: Buffer.from(bytes) } as Request, payload as never, metaSignature);
    }
    assert.equal(await queue.getWaitingCount(), 5, "delivered and read must be distinct while identical read retries collapse");
    const jobs = await queue.getWaiting();
    assert.ok(jobs.every((job) => job.id && !job.id.includes(":")), "custom IDs must satisfy BullMQ's restrictions");
  } finally {
    if (originalSecret === undefined) delete process.env.META_APP_SECRET; else process.env.META_APP_SECRET = originalSecret;
    await queue.obliterate({ force: true }); await queue.close();
  }
});
