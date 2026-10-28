import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { DataSource, AppDataSource, User, Tenant, TenantCredential, ConnectedAccount } from "@connectme/database";
import { TeamService } from "../src/infrastructure/services/team.service";
import { TypeOrmTenantRepository } from "../src/infrastructure/database/repositories/typeorm-tenant.repository";
import type { ClerkInvitationsService } from "../src/infrastructure/services/clerk-invitations.service";
import type { InboxRealtimeGateway } from "../src/presentation/gateways/inbox-realtime.gateway";
import { ForbiddenException } from "@nestjs/common";

const schema = `teamcheck_${randomUUID().replaceAll("-", "")}`;
let ds: DataSource;
let sql: Client;
let ready = false;
let sent = 0;
const disconnected: string[] = [];
let team: TeamService;
let tenants: TypeOrmTenantRepository;
let tenantId: string;
before(async () => {
  if (!process.env.DATABASE_URL) return;
  sql = new Client({ connectionString: process.env.DATABASE_URL }); await sql.connect();
  await sql.query(`CREATE SCHEMA "${schema}"`);
  ds = new DataSource({ ...AppDataSource.options, schema, migrations: [], synchronize: true } as never);
  await ds.initialize();
  const tenant = await ds.getRepository(Tenant).save({ slug: schema, name: "Security checks" }); tenantId = tenant.id;
  await ds.getRepository(User).save([
    { id: "owner1", tenantId, email: "owner1@test.local", role: "owner" },
    { id: "admin1", tenantId, email: "admin1@test.local", role: "admin" },
    { id: "agent1", tenantId, email: "agent1@test.local", role: "agent" },
    { id: "viewer1", tenantId, email: "viewer1@test.local", role: "viewer" },
  ]);
  const invitations = { list: async () => [], create: async (params: Record<string, unknown>) => { sent++; return { id: "inv1", createdAt: Date.now(), emailAddress: params.emailAddress }; } } as unknown as ClerkInvitationsService;
  team = new TeamService(ds.getRepository(User), ds.getRepository(Tenant), invitations, { disconnectMember: (id: string) => disconnected.push(id) } as unknown as InboxRealtimeGateway);
  tenants = new TypeOrmTenantRepository(ds.getRepository(Tenant), ds.getRepository(TenantCredential), ds.getRepository(ConnectedAccount), ds.getRepository(User));
  ready = true;
});
after(async () => {
  if (ds?.isInitialized) await ds.destroy();
  if (sql) { await sql.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await sql.end(); }
});
test("admins cannot demote owners or grant admin/owner privileges", async (t) => {
  if (!ready) return t.skip("Set DATABASE_URL to run isolated database security checks.");
  await assert.rejects(team.updateRole(tenantId, "owner1", { role: "viewer" }, "admin1"), ForbiddenException);
  await assert.rejects(team.updateRole(tenantId, "agent1", { role: "owner" }, "admin1"), ForbiddenException);
  await assert.rejects(team.inviteMember(tenantId, { email: "new@test.local", role: "admin" }, "admin1"), ForbiddenException);
  assert.equal(sent, 0);
});
test("invitation creation uses the acceptance page and never creates a fake member", async (t) => {
  if (!ready) return t.skip("Set DATABASE_URL to run isolated database security checks.");
  const invite = await team.inviteMember(tenantId, { email: "new@test.local", role: "viewer" }, "owner1");
  assert.equal(invite.status, "pending"); assert.equal(sent, 1);
  assert.equal(await ds.getRepository(User).count({ where: { tenantId } }), 4);
});
test("removal disables membership, disconnects sockets, and blocks default onboarding", async (t) => {
  if (!ready) return t.skip("Set DATABASE_URL to run isolated database security checks.");
  await team.removeMember(tenantId, "agent1", "admin1");
  assert.ok((await ds.getRepository(User).findOneByOrFail({ id: "agent1", tenantId })).disabledAt);
  assert.ok(disconnected.includes("agent1"));
  await assert.rejects(tenants.getOrCreateDefaultTenant("agent1"), ForbiddenException);
});
test("concurrent owner demotions cannot leave a workspace without an owner", async (t) => {
  if (!ready) return t.skip("Set DATABASE_URL to run isolated database security checks.");
  await ds.getRepository(User).save({ id: "owner2", tenantId, email: "owner2@test.local", role: "owner" });
  const results = await Promise.allSettled([
    team.updateRole(tenantId, "owner1", { role: "agent" }, "owner1"),
    team.updateRole(tenantId, "owner2", { role: "agent" }, "owner2"),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(await ds.getRepository(User).count({ where: { tenantId, role: "owner" } }), 1);
});
test("concurrent onboarding creates one owned workspace and similar user IDs do not share a tenant", async (t) => {
  if (!ready) return t.skip("Set DATABASE_URL to run isolated database security checks.");
  const prefix = "user_identicalprefix";
  const [a, b, other] = await Promise.all([
    tenants.getOrCreateDefaultTenant(`${prefix}A`, "a@test.local"),
    tenants.getOrCreateDefaultTenant(`${prefix}A`, "a@test.local"),
    tenants.getOrCreateDefaultTenant(`${prefix}B`, "b@test.local"),
  ]);
  assert.equal(a.id, b.id); assert.notEqual(a.id, other.id);
  assert.equal((await ds.getRepository(User).findOneByOrFail({ id: `${prefix}A` })).role, "owner");
});

test("membership migration promotes one legacy admin and disables fake invite records", async (t) => {
  if (!ready) return t.skip("Set DATABASE_URL to run isolated database security checks.");
  const tenant = await ds.getRepository(Tenant).save({ slug: `${schema}-legacy`, name: "Legacy" });
  await ds.getRepository(User).save([
    { id: "legacy-admin1", tenantId: tenant.id, email: "legacy1@test.local", role: "admin", createdAt: new Date("2026-01-01") },
    { id: "legacy-admin2", tenantId: tenant.id, email: "legacy2@test.local", role: "admin", createdAt: new Date("2026-01-02") },
    { id: "user_inv_fake", tenantId: tenant.id, email: "fake@test.local", role: "admin", createdAt: new Date("2025-01-01") },
  ]);
  const { SecureWorkspaceMembership1793145600000 } = await import("../../../packages/database/src/migrations/1793145600000-SecureWorkspaceMembership");
  const runner = ds.createQueryRunner();
  await runner.connect(); await runner.startTransaction();
  try {
    await runner.query(`SET LOCAL search_path TO "${schema}", public`);
    await new SecureWorkspaceMembership1793145600000().up(runner);
    await new SecureWorkspaceMembership1793145600000().up(runner);
    await runner.commitTransaction();
  } catch (error) { await runner.rollbackTransaction(); throw error; } finally { await runner.release(); }
  assert.equal((await ds.getRepository(User).findOneByOrFail({ id: "legacy-admin1", tenantId: tenant.id })).role, "owner");
  assert.equal((await ds.getRepository(User).findOneByOrFail({ id: "legacy-admin2", tenantId: tenant.id })).role, "admin");
  assert.ok((await ds.getRepository(User).findOneByOrFail({ id: "user_inv_fake", tenantId: tenant.id })).disabledAt);
});
