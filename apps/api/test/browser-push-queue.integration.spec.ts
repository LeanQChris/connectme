import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import { InboxRealtimeGateway } from "../src/presentation/gateways/inbox-realtime.gateway";
import { MessageDirection } from "@connectme/database";

test("API push producer shares the worker job ID and deduplicates inbound events in real Redis", async (t) => {
  if (!process.env.REDIS_URL) return t.skip("Set REDIS_URL for the isolated push queue check");
  const url = new URL(process.env.REDIS_URL);
  const queue = new Queue(`push-check-${randomUUID()}`, { connection: { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined, maxRetriesPerRequest: 1, retryStrategy: () => null } });
  const originalKey = process.env.VAPID_PUBLIC_KEY;
  process.env.VAPID_PUBLIC_KEY = "test-key";
  let enqueued: Promise<unknown> = Promise.resolve();
  const gateway = new InboxRealtimeGateway({} as any, {} as any, {} as any, {} as any, {
    find: async (q: any) => { assert.equal(q.where.tenantId, "tenant"); return [{ id: "device" }]; },
  } as any, { addBulk: (jobs: any[]) => { enqueued = queue.addBulk(jobs); return enqueued; } } as any);
  try {
    const message = { id: "message", direction: MessageDirection.INBOUND };
    for (let i = 0; i < 2; i++) {
      gateway.broadcastNewMessage("tenant", "conv", message);
      await new Promise<void>((resolve) => setImmediate(resolve)); await enqueued;
    }
    assert.equal(await queue.getWaitingCount(), 1);
    assert.equal((await queue.getWaiting())[0].id, "push-message-device");
    gateway.broadcastNewMessage("tenant", "conv", { id: "outbound", direction: MessageDirection.OUTBOUND });
    assert.equal(await queue.getWaitingCount(), 1);
  } finally {
    await queue.obliterate({ force: true }); await queue.close();
    if (originalKey === undefined) delete process.env.VAPID_PUBLIC_KEY; else process.env.VAPID_PUBLIC_KEY = originalKey;
  }
});
