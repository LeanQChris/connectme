import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ChannelType, ConversationStatus, MediaType, MessageDirection, MessageStatus } from "@connectme/database";
import { GetConversationDetailUseCase } from "../src/application/use-cases/conversations/get-conversation-detail.use-case";

function buildUseCase(messages: unknown[]) {
  const convRepo = {
    findById: async () => ({
      id: "conv-1",
      contactId: "contact-1",
      channel: ChannelType.WHATSAPP,
      accountId: null,
      account: null,
      contact: { name: "Ada", externalId: "wa-1", avatarUrl: null },
      lastMessageText: null,
      lastMessageAt: new Date("2026-01-01T00:00:00.000Z"),
      lastInboundAt: null,
      unreadCount: 0,
      lastReadAt: null,
      assignee: null,
      tags: [],
      status: ConversationStatus.OPEN,
    }),
    markAsRead: async () => undefined,
  };
  const messageRepo = { findMessagesPage: async () => messages };

  return new GetConversationDetailUseCase(convRepo as any, messageRepo as any);
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    direction: MessageDirection.INBOUND,
    type: MediaType.IMAGE,
    text: null,
    mediaMimeType: "image/jpeg",
    mediaSize: 10,
    externalId: "ext-1",
    channel: ChannelType.WHATSAPP,
    status: MessageStatus.RECEIVED,
    errorDetail: null,
    authorName: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("GetConversationDetailUseCase media mapping", () => {
  test("returns the multi-attachment array instead of dropping it", async () => {
    const useCase = buildUseCase([
      row({
        media: [
          { url: "https://cdn.example/a.jpg", type: "image", name: "a.jpg", size: 1 },
          { url: "https://cdn.example/b.jpg", type: "image", name: "b.jpg", size: 2 },
        ],
      }),
    ]);

    const result = await useCase.execute("tenant-X", "conv-1");

    assert.equal(result.messages.length, 1);
    const media = result.messages[0].media;
    assert.ok(media, "media array must survive serialization");
    assert.equal(media.length, 2);
    assert.deepEqual(
      media.map((m) => m.url),
      ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
    );
  });

  test("nulls the array when the row has no attachments", async () => {
    const useCase = buildUseCase([row({ media: null })]);

    const result = await useCase.execute("tenant-X", "conv-1");

    assert.equal(result.messages[0].media, null);
    // mediaUrl was dropped from the contract and must not be resurrected.
    assert.equal("mediaUrl" in result.messages[0], false);
  });

  test("coerces an off-contract stored kind to a valid MediaKind", async () => {
    // Pre-refactor rows can carry kinds the contract enum does not know about.
    const useCase = buildUseCase([
      row({ media: [{ url: "https://cdn.example/x.bin", type: "unknown-kind" }] }),
    ]);

    const result = await useCase.execute("tenant-X", "conv-1");

    assert.deepEqual(result.messages[0].media, [
      { url: "https://cdn.example/x.bin", type: "image", name: null, size: null, mimeType: null },
    ]);
  });
});
