import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { WhatsAppClient, ChannelHttpError } from "@connectme/channels";
import { WhatsAppTemplateService } from "../src/infrastructure/services/whatsapp-template.service";
import { ChannelType } from "@connectme/database";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";

// These checks never contact Meta or send messages.
test("template pagination uses the WABA endpoint and a cursor, never the provider's next URL", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json(urls.length === 1 ? { data: [{ id: "one" }], paging: { next: "https://untrusted.invalid/steal", cursors: { after: "cursor&value" } } } : { data: [{ id: "two" }] });
  };
  try {
    assert.equal((await new WhatsAppClient({} as any).fetchTemplates("123", "test-token")).length, 2);
    assert.ok(urls.every((u) => new URL(u).hostname === "graph.facebook.com"));
    assert.equal(new URL(urls[1]).searchParams.get("after"), "cursor&value");
    assert.ok(urls.every((u) => new URL(u).pathname.endsWith("/123/message_templates")));
  } finally { globalThis.fetch = original; }
});

test("provider failures and malformed pagination are not treated as an empty successful sync", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: { message: "Permission denied" } }, { status: 403 });
    const client = new WhatsAppClient({} as any);
    await assert.rejects(client.fetchTemplates("123", "token"), ChannelHttpError);
    await assert.rejects(client.submitTemplate("123", "token", {}), ChannelHttpError);
    globalThis.fetch = async () => Response.json({ data: [], paging: { next: "something" } });
    await assert.rejects(client.fetchTemplates("123", "token"), /pagination/);
  } finally { globalThis.fetch = original; }
});

test("listing an empty workspace never creates fake approved samples", async () => {
  const service = new WhatsAppTemplateService({ find: async (query: any) => { assert.equal(query.where.tenantId, "tenant"); return []; } } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  assert.deepEqual(await service.listTemplates("tenant"), []);
});

test("sending rejects drafts and checks the exact template language and tenant", async () => {
  let where: any;
  const service = new WhatsAppTemplateService({ findOne: async (q: any) => { where = q.where; return { status: "DRAFT" }; } } as any,
    { findOne: async () => ({ waPhoneNumberId: "phone", waBusinessAccountId: "waba", waAccessTokenEnc: "encrypted" }) } as any,
    { findOne: async () => ({ contact: { channel: ChannelType.WHATSAPP } }) } as any, {} as any, {} as any, {} as any,
    { decryptStrict: () => "token" } as any, {} as any);
  await assert.rejects(service.sendTemplateMessage("tenant", { conversationId: "conv", templateName: "notice", languageCode: "fr" }), BadRequestException);
  assert.deepEqual(where, { tenantId: "tenant", name: "notice", language: "fr" });
});

test("sending fails closed when Meta approval was revoked or cannot be checked", async () => {
  let fail = false;
  const service = new WhatsAppTemplateService({ findOne: async () => ({ status: "APPROVED", name: "notice", language: "en_US", rawTemplate: { id: "remote", _wabaId: "waba" } }) } as any,
    { findOne: async () => ({ waPhoneNumberId: "phone", waBusinessAccountId: "waba", waAccessTokenEnc: "encrypted" }) } as any,
    { findOne: async () => ({ contact: { channel: ChannelType.WHATSAPP } }) } as any, {} as any, {} as any,
    { fetchTemplates: async () => { if (fail) throw new Error("offline"); return [{ id: "remote", name: "notice", language: "en_US", status: "PAUSED" }]; } } as any,
    { decryptStrict: () => "token" } as any, {} as any);
  const dto = { conversationId: "conv", templateName: "notice", languageCode: "en_US" };
  await assert.rejects(service.sendTemplateMessage("tenant", dto), BadRequestException);
  fail = true;
  await assert.rejects(service.sendTemplateMessage("tenant", dto), ServiceUnavailableException);
});
