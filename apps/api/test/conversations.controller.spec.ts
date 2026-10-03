import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ConversationsController } from "../src/presentation/controllers/conversations.controller";

type Any = Record<string, unknown>;

function makeController(collected: { tenantId?: string; id?: string }): ConversationsController {
  const list = { execute: async (tenantId: string) => { collected.tenantId = tenantId; return []; } };
  const detail = { execute: async (tenantId: string, id: string) => { collected.tenantId = tenantId; collected.id = id; return {}; } };
  const update = { execute: async () => ({}) };
  const reply = { execute: async (input: Any) => { collected.tenantId = input.tenantId as string; collected.id = input.conversationId as string; return {}; } };
  const note = { execute: async (input: Any) => { collected.tenantId = input.tenantId as string; collected.id = input.conversationId as string; return {}; } };

  return new ConversationsController(
    list as any,
    detail as any,
    update as any,
    reply as any,
    note as any,
  );
}

describe("ConversationsController tenant isolation", () => {
  test("list forwards the authenticated tenant to the use case", async () => {
    const collected: { tenantId?: string } = {};
    const controller = makeController(collected);
    await controller.list("tenant-A");
    assert.equal(collected.tenantId, "tenant-A");
  });

  test("detail scopes the lookup to the authenticated tenant", async () => {
    const collected: { tenantId?: string; id?: string } = {};
    const controller = makeController(collected);
    await controller.getDetail("tenant-A", "conv-1");
    assert.equal(collected.tenantId, "tenant-A");
    assert.equal(collected.id, "conv-1");
  });

  test("reply scopes the send to the authenticated tenant", async () => {
    const collected: { tenantId?: string; id?: string } = {};
    const controller = makeController(collected);
    await controller.reply("tenant-B", "conv-2", { text: "hi" });
    assert.equal(collected.tenantId, "tenant-B");
    assert.equal(collected.id, "conv-2");
  });
});
