import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ProcessInboundTelegramUseCase } from "../src/application/use-cases/webhooks/process-inbound-telegram.use-case";
import { ProcessInboundMetaUseCase } from "../src/application/use-cases/webhooks/process-inbound-meta.use-case";

function telegramDeps(account: unknown) {
  const calls = { contactUpserted: false, defaultTenant: false };
  const tenantRepo = {
    findAccountByExternalId: async () => account,
    getOrCreateDefaultTenant: async () => {
      calls.defaultTenant = true;
      return { id: "system" };
    },
  };
  const contactRepo = {
    upsertContact: async () => {
      calls.contactUpserted = true;
      return { id: "contact-1" };
    },
  };
  const useCase = new ProcessInboundTelegramUseCase(
    tenantRepo as any,
    contactRepo as any,
    {
      findOrCreateForContact: async () => ({ id: "conv-1" }),
      updateLastMessage: async () => ({ id: "conv-1" }),
    } as any,
    { createMessage: async () => ({ id: "msg-1" }) } as any,
    { acquire: async () => true } as any,
    { broadcastNewMessage: () => {} } as any,
  );
  return { useCase, calls };
}

function metaDeps(account: unknown) {
  const calls = { contactUpserted: false, defaultTenant: false };
  const tenantRepo = {
    findAccountByExternalId: async () => account,
    getOrCreateDefaultTenant: async () => {
      calls.defaultTenant = true;
      return { id: "system" };
    },
  };
  const contactRepo = {
    upsertContact: async () => {
      calls.contactUpserted = true;
      return { id: "contact-1" };
    },
  };
  const useCase = new ProcessInboundMetaUseCase(
    tenantRepo as any,
    contactRepo as any,
    { findOrCreateForContact: async () => ({ id: "conv-1" }) } as any,
    { createMessage: async () => ({ id: "msg-1" }) } as any,
    { acquire: async () => true } as any,
    { broadcastNewMessage: () => {} } as any,
  );
  return { useCase, calls };
}

describe("Inbound webhook tenant routing", () => {
  test("Telegram drops updates for an unregistered bot without touching the shared tenant", async () => {
    const { useCase, calls } = telegramDeps(null);
    await useCase.execute("bot-unknown", {
      update_id: 1,
      message: { message_id: 1, chat: { id: 5 }, text: "hi" },
    } as any);

    assert.equal(calls.contactUpserted, false);
    assert.equal(calls.defaultTenant, false);
  });

  test("Telegram processes updates for a registered bot", async () => {
    const { useCase, calls } = telegramDeps({ tenantId: "tenant-1", id: "acc-1" });
    await useCase.execute("bot-known", {
      update_id: 2,
      message: { message_id: 2, chat: { id: 5 }, text: "hi" },
    } as any);

    assert.equal(calls.contactUpserted, true);
    assert.equal(calls.defaultTenant, false);
  });

  test("Meta drops WhatsApp changes for an unregistered phone number id", async () => {
    const { useCase, calls } = metaDeps(null);
    await useCase.execute({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "unknown" },
                messages: [{ id: "wamid.1", from: "1555", type: "text", text: { body: "hi" } }],
              },
            },
          ],
        },
      ],
    } as any);

    assert.equal(calls.contactUpserted, false);
    assert.equal(calls.defaultTenant, false);
  });

  test("Meta drops Messenger events for an unregistered page", async () => {
    const { useCase, calls } = metaDeps(null);
    await useCase.execute({
      object: "page",
      entry: [
        {
          id: "page-unknown",
          messaging: [{ sender: { id: "psid-1" }, message: { mid: "mid.1", text: "hi" } }],
        },
      ],
    } as any);

    assert.equal(calls.contactUpserted, false);
    assert.equal(calls.defaultTenant, false);
  });
});
