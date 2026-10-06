import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { generateKeyPairSync, sign } from "node:crypto";
import type { Request } from "express";
import { calculateHmacSha256 } from "@connectme/crypto";
import { WebhookController } from "../src/presentation/controllers/webhook.controller";
import { ChannelType } from "@connectme/database";

type Any = Record<string, unknown>;

function makeController(overrides: {
  tenantRepo?: Any;
  queue?: Any;
} = {}) {
  const queue = overrides.queue ?? { add: async () => ({ id: "job-1" }) };
  return new WebhookController((overrides.tenantRepo ?? {}) as any, queue as any);
}

function rawReq(body: string): Request {
  return { rawBody: Buffer.from(body) } as unknown as Request;
}

describe("WebhookController", () => {
  const originalSecret = process.env.META_APP_SECRET;
  const originalVerify = process.env.META_WEBHOOK_VERIFY_TOKEN;

  beforeEach(() => {
    process.env.META_APP_SECRET = "meta-secret";
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-token";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = originalSecret;
    if (originalVerify === undefined) delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    else process.env.META_WEBHOOK_VERIFY_TOKEN = originalVerify;
  });

  test("Meta GET challenge succeeds with the configured token", () => {
    const res = makeController().verifyMetaWebhook("subscribe", "verify-token", "challenge-123");
    assert.equal(res, "challenge-123");
  });

  test("Meta GET challenge rejects a wrong token", () => {
    assert.throws(
      () => makeController().verifyMetaWebhook("subscribe", "wrong", "challenge-123"),
      ForbiddenException,
    );
  });

  test("Meta POST accepts a valid raw-body signature and enqueues processing", async () => {
    const enqueued: Array<{ name: string; data: unknown }> = [];
    const controller = makeController({
      queue: {
        add: async (name: string, data: unknown) => {
          enqueued.push({ name, data });
          return { id: "job-1" };
        },
      },
    });
    const body = JSON.stringify({ object: "page", entry: [] });
    const signature = `sha256=${calculateHmacSha256(body, "meta-secret")}`;

    const result = await controller.handleMetaWebhook(rawReq(body), { object: "page", entry: [] } as any, signature);
    assert.deepEqual(result, { status: "EVENT_RECEIVED" });
    assert.equal(enqueued.length, 1);
    assert.equal(enqueued[0].name, "meta");
  });

  test("Meta POST rejects a tampered signature", async () => {
    const controller = makeController();
    const body = JSON.stringify({ object: "page", entry: [] });
    const signature = `sha256=${calculateHmacSha256(body, "wrong-secret")}`;

    await assert.rejects(
      () => controller.handleMetaWebhook(rawReq(body), { object: "page", entry: [] } as any, signature),
      ForbiddenException,
    );
  });

  test("Telegram rejects an unknown bot", async () => {
    const controller = makeController({
      tenantRepo: { findAccountByExternalId: async () => null },
    });
    await assert.rejects(
      () => controller.handleTelegramWebhook("123", "secret", {} as any),
      ForbiddenException,
    );
  });

  test("Telegram rejects a bad secret token", async () => {
    const controller = makeController({
      tenantRepo: {
        findAccountByExternalId: async () => ({ tenantId: "t1" }),
        getCredentials: async () => ({ webhookVerifyToken: "expected" }),
      },
    });
    await assert.rejects(
      () => controller.handleTelegramWebhook("123", "wrong", {} as any),
      ForbiddenException,
    );
  });

  test("Discord accepts a valid Ed25519 signature", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const spki = publicKey.export({ format: "der", type: "spki" });
    const publicKeyHex = spki.subarray(spki.length - 32).toString("hex");

    const controller = makeController({
      tenantRepo: {
        findAccountByExternalId: async () => ({ tenantId: "t1" }),
        getCredentials: async () => ({ discordPublicKey: publicKeyHex }),
      },
    });

    const body = JSON.stringify({ type: 1, id: "1", token: "t", application_id: "app-1" });
    const timestamp = "1700000000";
    const signature = sign(
      null,
      Buffer.concat([Buffer.from(timestamp), Buffer.from(body)]),
      privateKey,
    ).toString("hex");

    const result = await controller.handleDiscordWebhook(
      rawReq(body),
      signature,
      timestamp,
      { type: 1, id: "1", token: "t", application_id: "app-1" } as any,
    );
    assert.deepEqual(result, { type: 1 });
  });

  test("Discord rejects an invalid signature", async () => {
    const { publicKey } = generateKeyPairSync("ed25519");
    const spki = publicKey.export({ format: "der", type: "spki" });
    const publicKeyHex = spki.subarray(spki.length - 32).toString("hex");

    const controller = makeController({
      tenantRepo: {
        findAccountByExternalId: async () => ({ tenantId: "t1" }),
        getCredentials: async () => ({ discordPublicKey: publicKeyHex }),
      },
    });
    await assert.rejects(
      () =>
        controller.handleDiscordWebhook(
          rawReq("{}"),
          "00".repeat(64),
          "1700000000",
          { type: 1, id: "1", token: "t", application_id: "app-1" } as any,
        ),
      ForbiddenException,
    );
  });
});

describe("WebhookController redelivery dedup", () => {
  function capturingQueue(sink: Array<{ jobId?: string }>) {
    return {
      add: async (_name: string, _data: unknown, opts: { jobId?: string }) => {
        sink.push({ jobId: opts?.jobId });
        return { id: "job" };
      },
    };
  }

  const metaPayload = (messageId: string) => ({
    object: "whatsapp_business_account",
    entry: [{ id: "e1", changes: [{ value: { messages: [{ id: messageId }] } }] }],
  });

  test("the same Meta payload produces the same jobId", async () => {
    const sink: Array<{ jobId?: string }> = [];
    const controller = makeController({ queue: capturingQueue(sink) as any });
    const payload = metaPayload("wamid.ABC");

    await (controller as any).dispatch("meta", { payload, receivedAt: 1 }, payload);
    await (controller as any).dispatch("meta", { payload, receivedAt: 2 }, payload);

    assert.ok(sink[0].jobId, "a Meta event id must yield a jobId");
    assert.equal(sink[0].jobId, sink[1].jobId);
  });

  test("a different Meta payload produces a different jobId", async () => {
    const sink: Array<{ jobId?: string }> = [];
    const controller = makeController({ queue: capturingQueue(sink) as any });

    await (controller as any).dispatch("meta", { receivedAt: 1 }, metaPayload("wamid.A"));
    await (controller as any).dispatch("meta", { receivedAt: 2 }, metaPayload("wamid.B"));

    assert.notEqual(sink[0].jobId, sink[1].jobId);
  });

  test("a Meta payload with no event ids falls back to no jobId", async () => {
    // Never dedup on a key we cannot verify: a wrong hit drops a real message.
    const sink: Array<{ jobId?: string }> = [];
    const controller = makeController({ queue: capturingQueue(sink) as any });

    await (controller as any).dispatch("meta", { receivedAt: 1 }, { object: "whatsapp_business_account", entry: [] });

    assert.equal(sink[0].jobId, undefined);
  });

  test("telegram, slack and discord dedup on their own event ids", async () => {
    const sink: Array<{ jobId?: string }> = [];
    const controller = makeController({ queue: capturingQueue(sink) as any });

    await (controller as any).dispatch("telegram", { receivedAt: 1 }, { update_id: 42 });
    await (controller as any).dispatch("telegram", { receivedAt: 2 }, { update_id: 42 });
    await (controller as any).dispatch("telegram", { receivedAt: 3 }, { update_id: 43 });

    await (controller as any).dispatch("slack", { receivedAt: 1 }, { event_id: "Ev1" });
    await (controller as any).dispatch("slack", { receivedAt: 2 }, { event_id: "Ev1" });

    await (controller as any).dispatch("discord", { receivedAt: 1 }, { id: "int-1" });
    await (controller as any).dispatch("discord", { receivedAt: 2 }, { id: "int-1" });

    assert.ok(sink[0].jobId);
    assert.equal(sink[0].jobId, sink[1].jobId, "telegram update_id stable");
    assert.notEqual(sink[0].jobId, sink[2].jobId, "different telegram update differs");

    assert.equal(sink[3].jobId, sink[4].jobId, "slack event_id stable");

    assert.equal(sink[5].jobId, sink[6].jobId, "discord interaction id stable");
  });
});
