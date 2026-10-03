import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { ChannelType, MessageStatus } from "@connectme/database";
import { SendReplyUseCase } from "../src/application/use-cases/messages/send-reply.use-case";

type Any = Record<string, unknown>;

function build(options: {
  channel?: ChannelType;
  lastInboundAt?: Date | null;
  sendFails?: boolean;
}) {
  const calls = {
    created: false,
    updatedSnippet: false,
    broadcast: false,
    finalStatus: undefined as MessageStatus | undefined,
  };

  const conv = {
    id: "conv-1",
    tenantId: "tenant-1",
    channel: options.channel ?? ChannelType.TELEGRAM,
    lastInboundAt: options.lastInboundAt ?? null,
    account: null,
    contact: { externalId: "contact-ext" },
  };

  const tenantRepo = { getCredentials: async () => null };
  const convRepo = {
    findById: async () => conv,
    updateLastMessage: async () => {
      calls.updatedSnippet = true;
      return conv;
    },
  };
  const messageRepo = {
    createMessage: async () => {
      calls.created = true;
      return { id: "msg-1", status: MessageStatus.SENT };
    },
    updateStatus: async (_id: string, status: MessageStatus) => {
      calls.finalStatus = status;
    },
  };

  const telegramClient = {
    sendText: async () => {
      if (options.sendFails) throw new Error("telegram down");
      return { externalId: "ext-1" };
    },
  };
  const gateway = {
    broadcastNewMessage: () => {
      calls.broadcast = true;
    },
  };

  const useCase = new SendReplyUseCase(
    tenantRepo as any,
    convRepo as any,
    messageRepo as any,
    {} as any,
    {} as any,
    {} as any,
    telegramClient as any,
    {} as any,
    gateway as any,
  );

  return { useCase, calls };
}

describe("SendReplyUseCase", () => {
  test("rejects when the Meta reply window is closed", async () => {
    const { useCase, calls } = build({
      channel: ChannelType.WHATSAPP,
      lastInboundAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });

    await assert.rejects(
      () => useCase.execute({ tenantId: "tenant-1", conversationId: "conv-1", text: "hi" }),
      BadRequestException,
    );
    assert.equal(calls.created, false);
  });

  test("delivers, updates the snippet, and broadcasts on success", async () => {
    const { useCase, calls } = build({ channel: ChannelType.TELEGRAM });

    const msg = await useCase.execute({
      tenantId: "tenant-1",
      conversationId: "conv-1",
      text: "hello",
    });

    assert.equal(msg.id, "msg-1");
    assert.equal(calls.finalStatus, MessageStatus.DELIVERED);
    assert.equal(calls.updatedSnippet, true);
    assert.equal(calls.broadcast, true);
  });

  test("surfaces a dispatch failure and does not bump the conversation snippet", async () => {
    const { useCase, calls } = build({ channel: ChannelType.TELEGRAM, sendFails: true });

    await assert.rejects(
      () => useCase.execute({ tenantId: "tenant-1", conversationId: "conv-1", text: "hello" }),
      BadGatewayException,
    );
    assert.equal(calls.finalStatus, MessageStatus.FAILED);
    assert.equal(calls.updatedSnippet, false);
    assert.equal(calls.broadcast, true);
  });
});
