import { test } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { TenantMembershipService } from "../src/presentation/auth/tenant-membership.service";
import type { ITenantRepository } from "../src/domain/repositories/i-tenant.repository";
import type { ClerkTokenVerifier } from "../src/presentation/auth/clerk-token-verifier.service";

function setup(existing: unknown = null, metadata: Record<string, unknown> = {}) {
  let stored = existing; let defaults = 0; let lookups = 0;
  const repo = {
    findUserById: async () => stored,
    findById: async (id: string) => id === "invited" ? { id } : null,
    saveUser: async (user: unknown) => { stored = user; return user; },
    getOrCreateDefaultTenant: async (id: string, email: string) => { defaults++; stored = { id, email, tenantId: "own", role: "owner" }; },
  } as unknown as ITenantRepository;
  const clerk = { getProfile: async () => { lookups++; return { primaryEmailAddress: { emailAddress: "person@test.local", verification: { status: "verified" } }, publicMetadata: metadata }; } } as unknown as ClerkTokenVerifier;
  return { service: new TenantMembershipService(repo, clerk), clerk, defaults: () => defaults, lookups: () => lookups };
}
test("accepted invitations resolve directly to their workspace without default onboarding", async () => {
  const s = setup(null, { connectmeTenantId: "invited", connectmeRole: "viewer" });
  const member = await s.service.resolve("new"); assert.equal(member.tenantId, "invited"); assert.equal(member.role, "viewer"); assert.equal(s.defaults(), 0);
});
test("removed members cannot rejoin via stale invitation metadata or tenant caches", async () => {
  const s = setup({ id: "removed", tenantId: "invited", role: "agent", disabledAt: new Date() }, { connectmeTenantId: "invited" });
  await assert.rejects(s.service.resolve("removed"), ForbiddenException); assert.equal(s.lookups(), 0); assert.equal(s.defaults(), 0);
});
test("identity provider failure never creates a different workspace", async () => {
  const s = setup(); s.clerk.getProfile = async () => { throw new ServiceUnavailableException(); };
  await assert.rejects(s.service.resolve("new"), ServiceUnavailableException); assert.equal(s.defaults(), 0);
});
test("unverified emails and invalid invitation roles are rejected", async () => {
  const s = setup(null, { connectmeTenantId: "invited", connectmeRole: "owner" }); await assert.rejects(s.service.resolve("new"), ForbiddenException);
  const unverified = setup(); unverified.clerk.getProfile = async () => ({ primaryEmailAddress: { verification: { status: "unverified" } } }) as never;
  await assert.rejects(unverified.service.resolve("new"), ForbiddenException); assert.equal(unverified.defaults(), 0);
});
test("new accounts own their own workspace", async () => {
  const s = setup(); const member = await s.service.resolve("new"); assert.equal(member.role, "owner"); assert.equal(s.defaults(), 1);
});
