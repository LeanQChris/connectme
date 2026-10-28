import { test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClerkAuthGuard, AuthenticatedRequest } from "../src/presentation/auth/clerk-auth.guard";
import { ClerkTokenVerifier } from "../src/presentation/auth/clerk-token-verifier.service";
import { TenantMembershipService } from "../src/presentation/auth/tenant-membership.service";
import { IS_PUBLIC_KEY } from "../src/presentation/auth/public.decorator";
import { REQUIRED_ROLES_KEY } from "../src/presentation/auth/require-roles.decorator";

function setup(role = "agent", requiredRoles?: string[], isPublic = false) {
  let verified = false;
  const reflector = { getAllAndOverride: (key: string) => key === IS_PUBLIC_KEY ? isPublic : key === REQUIRED_ROLES_KEY ? requiredRoles : undefined } as unknown as Reflector;
  const verifier = { verify: async (token: string) => { if (token !== "valid") throw new UnauthorizedException(); verified = true; return { sub: "user_real" }; } } as unknown as ClerkTokenVerifier;
  const membership = { resolve: async (id: string) => ({ id, tenantId: "tenant_real", role }) } as unknown as TenantMembershipService;
  const request: AuthenticatedRequest & { method: string } = { headers: { authorization: "Bearer valid", "x-tenant-id": "attacker" }, method: "GET" };
  const ctx = { getHandler: () => () => {}, getClass: () => class {}, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  return { guard: new ClerkAuthGuard(reflector, verifier, membership), request, ctx, verified: () => verified };
}

test("public routes do not require a session", async () => {
  const s = setup("viewer", undefined, true); s.request.headers = {};
  assert.equal(await s.guard.canActivate(s.ctx), true); assert.equal(s.verified(), false);
});
test("missing, malformed, and invalid sessions are rejected", async () => {
  for (const authorization of [undefined, "Basic abc", "Bearer invalid", "Bearer "]) {
    const s = setup(); s.request.headers = { authorization };
    await assert.rejects(s.guard.canActivate(s.ctx), UnauthorizedException);
  }
});
test("verified identity supplies tenant and role, ignoring tenant headers", async () => {
  const s = setup(); await s.guard.canActivate(s.ctx);
  assert.equal(s.request.tenantId, "tenant_real"); assert.equal(s.request.userId, "user_real"); assert.equal(s.request.userRole, "agent");
});
test("viewers can read but cannot invoke any mutation", async () => {
  const s = setup("viewer"); assert.equal(await s.guard.canActivate(s.ctx), true);
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    s.request.method = method; await assert.rejects(s.guard.canActivate(s.ctx), ForbiddenException);
  }
});
test("manager routes reject agents and viewers", async () => {
  for (const role of ["agent", "viewer"]) {
    const s = setup(role, ["owner", "admin"]); await assert.rejects(s.guard.canActivate(s.ctx), ForbiddenException);
  }
  const s = setup("admin", ["owner", "admin"]); assert.equal(await s.guard.canActivate(s.ctx), true);
});
