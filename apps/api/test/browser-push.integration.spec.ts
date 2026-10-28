import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { DataSource, AppDataSource, Tenant, User, BrowserPushSubscription } from "@connectme/database";
import { encryptPayload, decryptPayloadStrict } from "@connectme/crypto";
import { BrowserPushController } from "../src/presentation/controllers/browser-push.controller";

const schema = `pushcheck_${randomUUID().replaceAll("-", "")}`;
let ds: DataSource;
let sql: Client;
let controller: BrowserPushController;
let tenantId: string;
let otherTenant: string;
let queued = 0;
const previous = { VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY, VAPID_SUBJECT: process.env.VAPID_SUBJECT };
const encryptionKey = "isolated-browser-push-encryption-key-32-chars";
const subscription = { endpoint: "https://fcm.googleapis.com/fake", expirationTime: null, keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) } };
before(async () => {
  if (!process.env.DATABASE_URL) return;
  sql = new Client({ connectionString: process.env.DATABASE_URL }); await sql.connect(); await sql.query(`CREATE SCHEMA "${schema}"`);
  ds = new DataSource({ ...AppDataSource.options, schema, migrations: [], synchronize: true } as never); await ds.initialize();
  tenantId = (await ds.getRepository(Tenant).save({ slug: schema, name: "Push" })).id;
  otherTenant = (await ds.getRepository(Tenant).save({ slug: `${schema}-other`, name: "Other" })).id;
  await ds.getRepository(User).save([{ id: "push-viewer", tenantId, email: "viewer@test.local", role: "viewer" }, { id: "push-other", tenantId: otherTenant, email: "other@test.local", role: "owner" }]);
  Object.assign(process.env, { VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private", VAPID_SUBJECT: "mailto:test@test.local" });
  controller = new BrowserPushController(ds.getRepository(BrowserPushSubscription), { encrypt: (value: unknown) => encryptPayload(value, encryptionKey) } as any, { addBulk: async (jobs: any[]) => { queued += jobs.length; } } as any);
});
after(async () => {
  if (ds?.isInitialized) await ds.destroy();
  if (sql) { await sql.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await sql.end(); }
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});
test("push subscriptions are encrypted, idempotent, scoped to the member, and removable", async (t) => {
  if (!ds) return t.skip("Set DATABASE_URL for isolated browser push checks");
  const req = { userId: "push-viewer", headers: {} };
  await controller.subscribe(tenantId, req, subscription);
  await controller.subscribe(tenantId, req, subscription);
  const repo = ds.getRepository(BrowserPushSubscription);
  assert.equal(await repo.countBy({ tenantId }), 1);
  const encrypted = (await repo.findOneByOrFail({ tenantId })).subscriptionEnc;
  assert.ok(!encrypted.includes(subscription.endpoint));
  assert.deepEqual(decryptPayloadStrict(encrypted, encryptionKey), subscription);
  await controller.test(tenantId, req); assert.equal(queued, 1);
  await assert.rejects(controller.test(otherTenant, { userId: "push-other", headers: {} }));
  await controller.unsubscribe(otherTenant, { userId: "push-other", headers: {} }, subscription);
  assert.equal(await repo.countBy({ tenantId }), 1);
  await controller.unsubscribe(tenantId, req, subscription);
  assert.equal(await repo.countBy({ tenantId }), 0);
});
test("browser push migration creates a tenant/member constrained subscription table", async (t) => {
  if (!ds) return t.skip("Set DATABASE_URL for isolated browser push checks");
  const { BrowserPushSubscriptions1793145800000 } = await import("../../../packages/database/src/migrations/1793145800000-BrowserPushSubscriptions");
  const runner = ds.createQueryRunner(); await runner.connect(); await runner.startTransaction();
  try {
    await runner.query(`SET LOCAL search_path TO "${schema}", public`);
    await runner.query(`DROP TABLE "browser_push_subscriptions"`);
    await new BrowserPushSubscriptions1793145800000().up(runner);
    await runner.commitTransaction();
  } catch (err) { await runner.rollbackTransaction(); throw err; } finally { await runner.release(); }
  await controller.subscribe(tenantId, { userId: "push-viewer", headers: {} }, subscription);
  assert.equal(await ds.getRepository(BrowserPushSubscription).countBy({ tenantId }), 1);
});
