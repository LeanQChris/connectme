import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ChannelType, ConversationStatus } from "@connectme/database";
import { ListConversationsUseCase } from "../src/application/use-cases/conversations/list-conversations.use-case";

describe("ListConversationsUseCase", () => {
  test("scopes the query to the tenant and maps the result", async () => {
    let receivedTenant: string | undefined;
    let receivedFilter: unknown;

    const convRepo = {
      listConversations: async (tenantId: string, filter: unknown) => {
        receivedTenant = tenantId;
        receivedFilter = filter;
        return [
          {
            id: "conv-1",
            contactId: "contact-1",
            channel: ChannelType.WHATSAPP,
            accountId: null,
            account: null,
            contact: { name: "Ada", externalId: "wa-1", avatarUrl: null },
            lastMessageText: null,
            lastMessageAt: new Date("2026-01-01T00:00:00.000Z"),
            lastInboundAt: null,
            unreadCount: 3,
            lastReadAt: null,
            assignee: null,
            tags: ["vip"],
            status: ConversationStatus.OPEN,
          },
        ];
      },
    };

    const useCase = new ListConversationsUseCase(convRepo as any);
    const result = await useCase.execute("tenant-X", { channel: ChannelType.WHATSAPP });

    assert.equal(receivedTenant, "tenant-X");
    assert.deepEqual(receivedFilter, { channel: ChannelType.WHATSAPP });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "conv-1");
    assert.equal(result[0].contactName, "Ada");
    assert.equal(result[0].lastMessage, null);
    assert.equal(result[0].channel, "whatsapp");
    assert.deepEqual(result[0].tags, ["vip"]);
  });
});
