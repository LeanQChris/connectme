import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { AppDataSource, DataSource, Tenant, TenantCredential, WhatsAppTemplate, Conversation, Message, Contact } from "@connectme/database";
import { WhatsAppTemplateService } from "../src/infrastructure/services/whatsapp-template.service";
import { ChannelHttpError } from "@connectme/channels";

const schema = `templatecheck_${randomUUID().replaceAll("-", "")}`;
let ds: DataSource;
let sql: Client;
let service: WhatsAppTemplateService;
let tenantId: string;
let calls = 0;
let mode = "ok";
let remote: any[] = [];
before(async () => {
  if (!process.env.DATABASE_URL) return;
  sql = new Client({ connectionString: process.env.DATABASE_URL }); await sql.connect();
  await sql.query(`CREATE SCHEMA "${schema}"`);
  ds = new DataSource({ ...AppDataSource.options, schema, migrations: [], synchronize: true } as never); await ds.initialize();
  tenantId = (await ds.getRepository(Tenant).save({ slug: schema, name: "Templates" })).id;
  await ds.getRepository(TenantCredential).save({ tenantId, waBusinessAccountId: "123", waAccessTokenEnc: "encrypted" });
  service = new WhatsAppTemplateService(ds.getRepository(WhatsAppTemplate), ds.getRepository(TenantCredential), ds.getRepository(Conversation), ds.getRepository(Message), ds.getRepository(Contact), {
    submitTemplate: async () => {
      calls++;
      // The reservation must be committed and visible before contacting Meta.
      assert.equal(await ds.getRepository(WhatsAppTemplate).countBy({ tenantId, status: "SUBMITTED" }), 1);
      if (mode === "reject") throw new ChannelHttpError("Invalid template", 400, false);
      if (mode === "offline") throw new Error("timeout");
      return { id: "remote", status: "APPROVED" };
    }, fetchTemplates: async () => remote,
  } as any, { decryptStrict: () => "token" } as any, {} as any);
});
after(async () => { if (ds?.isInitialized) await ds.destroy(); if (sql) { await sql.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await sql.end(); } });
const dto = (name: string) => ({ name, language: "en_US", category: "UTILITY" as const, bodyText: "Hello {{1}} {{1}}", bodyExamples: ["Alex"] });

test("draft editing, tenant isolation and concurrent submission preserve real approval semantics", async (t) => {
  if (!ds) return t.skip("Set DATABASE_URL for isolated template database checks");
  const draft = await service.createTemplateDraft(tenantId, dto("notice"));
  assert.equal(draft.status, "DRAFT");
  await assert.rejects(service.submitTemplate(randomUUID(), draft.id));
  await service.updateDraft(tenantId, draft.id, { ...dto("notice"), footerText: "Support" });
  const results = await Promise.allSettled([service.submitTemplate(tenantId, draft.id), service.submitTemplate(tenantId, draft.id)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(calls, 1);
  assert.equal((await ds.getRepository(WhatsAppTemplate).findOneByOrFail({ id: draft.id, tenantId })).status, "PENDING");
  await assert.rejects(service.updateDraft(tenantId, draft.id, dto("notice")));
  remote = [{ id: "remote", name: "notice", language: "en_US", status: "APPROVED", category: "UTILITY", components: [{ type: "BODY", text: "Hello {{1}}" }] }];
  assert.equal((await service.syncTemplates(tenantId)).templates[0].status, "APPROVED");
  remote = [];
  assert.equal((await service.syncTemplates(tenantId)).templates[0].status, "DISABLED");
});

test("confirmed rejection is editable; uncertain submission stays locked until reconciliation", async (t) => {
  if (!ds) return t.skip("Set DATABASE_URL for isolated template database checks");
  mode = "reject";
  const draft = await service.createTemplateDraft(tenantId, dto("retry"));
  await assert.rejects(service.submitTemplate(tenantId, draft.id), /Meta rejected/);
  assert.equal((await ds.getRepository(WhatsAppTemplate).findOneByOrFail({ id: draft.id, tenantId })).status, "DRAFT");
  mode = "offline";
  await assert.rejects(service.submitTemplate(tenantId, draft.id), /could not be confirmed/);
  assert.equal((await ds.getRepository(WhatsAppTemplate).findOneByOrFail({ id: draft.id, tenantId })).status, "SUBMITTED");
  const before = calls;
  await assert.rejects(service.submitTemplate(tenantId, draft.id));
  assert.equal(calls, before);
});

test("missing variable examples prevent provider submission", async (t) => {
  if (!ds) return t.skip("Set DATABASE_URL for isolated template database checks");
  const draft = await service.createTemplateDraft(tenantId, { ...dto("examples"), bodyExamples: [] });
  const before = calls;
  await assert.rejects(service.submitTemplate(tenantId, draft.id), /example/);
  assert.equal(calls, before);
});

test("migration demotes local approvals without touching genuine provider records", async (t) => {
  if (!ds) return t.skip("Set DATABASE_URL for isolated template database checks");
  const repo = ds.getRepository(WhatsAppTemplate);
  const legacy = await repo.save({ tenantId, name: "legacy", status: "APPROVED", components: [] });
  const { WhatsAppTemplateApproval1793145700000 } = await import("../../../packages/database/src/migrations/1793145700000-WhatsAppTemplateApproval");
  const runner = ds.createQueryRunner(); await runner.connect(); await runner.startTransaction();
  try { await runner.query(`SET LOCAL search_path TO "${schema}", public`); await new WhatsAppTemplateApproval1793145700000().up(runner); await runner.commitTransaction(); }
  catch (err) { await runner.rollbackTransaction(); throw err; } finally { await runner.release(); }
  assert.equal((await repo.findOneByOrFail({ id: legacy.id, tenantId })).status, "DRAFT");
});
