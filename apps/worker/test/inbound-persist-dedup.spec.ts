import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ChannelType, MediaType } from "@connectme/database";
import { createMessage } from "../src/processors/inbound-persist.helpers";

/**
 * Inbound message dedup.
 *
 * `messages` carries a unique (conversationId, externalId) index, so a provider
 * redelivery used to throw a unique violation, fail the job, and burn all five
 * retries — for five of the six channel paths there was no guard at all (only
 * Slack checked first). These cases pin the guard so a redelivery becomes a
 * no-op instead of a job failure.
 */
function makeRepo(overrides: {
  existing?: Record<string, unknown> | null;
  saveError?: Error;
} = {}) {
  const saved: Record<string, unknown>[] = [];
  let findOneCalls = 0;

  return {
    saved,
    get findOneCalls() {
      return findOneCalls;
    },
    create: (d: Record<string, unknown>) => d,
    findOne: async () => {
      findOneCalls += 1;
      return overrides.existing ?? null;
    },
    save: async (entity: Record<string, unknown>) => {
      if (overrides.saveError) throw overrides.saveError;
      saved.push(entity);
      return { id: "msg-1", ...entity };
    },
  };
}

const baseInput = {
  conversationId: "conv-1",
  externalId: "wamid.ABC",
  channel: ChannelType.WHATSAPP,
  type: MediaType.TEXT,
  text: "hello",
};

test("inserts when the message is new", async () => {
  const repo = makeRepo();

  const result = await createMessage(repo as any, baseInput);

  assert.equal(result?.id, "msg-1");
  assert.equal(repo.saved.length, 1);
  assert.equal(repo.findOneCalls, 1);
});

test("returns null and skips the write when the message already exists", async () => {
  const repo = makeRepo({ existing: { id: "dup" } });

  const result = await createMessage(repo as any, baseInput);

  assert.equal(result, null);
  assert.equal(repo.saved.length, 0, "a redelivery must not write a second row");
});

test("treats a unique violation as a duplicate instead of failing the job", async () => {
  // Two workers race the same redelivered event: both pass the existence check,
  // so the loser loses on the unique index.
  const repo = makeRepo({ saveError: Object.assign(new Error("duplicate key value"), { code: "23505" }) });

  const result = await createMessage(repo as any, baseInput);

  assert.equal(result, null);
});

test("still throws genuine database failures", async () => {
  const repo = makeRepo({ saveError: new Error("connection terminated") });

  await assert.rejects(() => createMessage(repo as any, baseInput), /connection terminated/);
});

test("does not look up a message that has no external id", async () => {
  const repo = makeRepo();

  const result = await createMessage(repo as any, { ...baseInput, externalId: null });

  assert.equal(repo.findOneCalls, 0, "nothing to dedup on without an external id");
  assert.equal(result?.id, "msg-1");
});
