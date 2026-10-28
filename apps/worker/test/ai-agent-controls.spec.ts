import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { UnrecoverableError } from "bullmq";
import { AiAgentProcessor } from "../src/processors/ai-agent.processor";
import { ChannelType, ConversationStatus, MessageDirection } from "@connectme/database";

function createProcessor(overrides: { status?: ConversationStatus; assigneeId?: string; disableAfterGeneration?: boolean } = {}) {
  let generated = false;
  const conv = { id: "conv", tenantId: "tenant", channel: ChannelType.TELEGRAM, contact: { externalId: "recipient" }, status: ConversationStatus.OPEN, ...overrides };
  const processor = new AiAgentProcessor({ findOne: async () => conv } as any,
    { findOne: async (query: any) => query.where.id ? { direction: MessageDirection.INBOUND, createdAt: new Date() } : null,
      find: async () => [] } as any, {} as any, {} as any, {} as any,
    { isAutoReplyEnabled: async () => !(generated && overrides.disableAfterGeneration), generateReply: async () => { generated = true; return "Hello"; } } as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { processor, generated: () => generated };
}
test("AI skips assigned and closed conversations", async () => {
  for (const overrides of [{ status: ConversationStatus.CLOSED }, { assigneeId: "agent" }]) {
    const { processor, generated } = createProcessor(overrides);
    await processor.process({ data: { tenantId: "tenant", conversationId: "conv", messageId: "msg" } } as any);
    assert.equal(generated(), false);
  }
});
test("disabling automatic replies while generation is in flight prevents sending", async () => {
  const { processor, generated } = createProcessor({ disableAfterGeneration: true });
  await processor.process({ data: { tenantId: "tenant", conversationId: "conv", messageId: "msg" } } as any);
  assert.equal(generated(), true);
});
test("automated replies never use HUMAN_AGENT to bypass a closed Meta window", () => {
  const { processor } = createProcessor();
  for (const channel of [ChannelType.WHATSAPP, ChannelType.MESSENGER, ChannelType.INSTAGRAM]) {
    assert.throws(() => (processor as any).resolveMetaTag({ channel, lastInboundAt: new Date(Date.now() - 25 * 3600000) }), UnrecoverableError);
    assert.equal((processor as any).resolveMetaTag({ channel, lastInboundAt: new Date() }), undefined);
  }
});
