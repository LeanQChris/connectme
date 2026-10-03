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
