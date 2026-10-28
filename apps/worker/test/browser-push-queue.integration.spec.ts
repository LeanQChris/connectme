import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import { RealtimePublisher } from "../src/realtime/realtime-publisher";
import { MessageDirection } from "@connectme/database";

test("worker push producer deduplicates the same inbound event in real Redis", async (t) => {
  if (!process.env.REDIS_URL) return t.skip("Set REDIS_URL for the isolated push queue check");
  const url = new URL(process.env.REDIS_URL);
  const queue = new Queue(`push-check-${randomUUID()}`, { connection: { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined, maxRetriesPerRequest: 1, retryStrategy: () => null } });
  const originalKey = process.env.VAPID_PUBLIC_KEY;
  process.env.VAPID_PUBLIC_KEY = "test-key";
  const subscriptions = { find: async (q: any) => { assert.equal(q.where.tenantId, "tenant"); return [{ id: "device" }]; } };
  const publisher = new RealtimePublisher(subscriptions as any, queue);
  try {
    const message = { id: "message", direction: MessageDirection.INBOUND };
    const event = { type: "message:new" as const, tenantId: "tenant", payload: { conversationId: "conv", message } };
    await publisher.publish(event); await publisher.publish(event);
    assert.equal(await queue.getWaitingCount(), 1);
    await publisher.publish({ ...event, payload: { message: { id: "outbound", direction: MessageDirection.OUTBOUND } } });
    assert.equal(await queue.getWaitingCount(), 1);
    assert.ok((await queue.getWaiting())[0].id?.startsWith("push-message-device"));
  } finally {
    await publisher.onModuleDestroy(); await queue.obliterate({ force: true }); await queue.close();
    if (originalKey === undefined) delete process.env.VAPID_PUBLIC_KEY; else process.env.VAPID_PUBLIC_KEY = originalKey;
  }
});
