import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClerkAuthGuard } from "../src/presentation/auth/clerk-auth.guard";
import type { ClerkTokenVerifier } from "../src/presentation/auth/clerk-token-verifier.service";
import type { AuthenticatedRequest } from "../src/presentation/auth/clerk-auth.guard";
import type { ITenantRepository } from "../src/domain/repositories/i-tenant.repository";

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  const handler = function handler() {};
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(isPublic: boolean): Reflector {
  return { getAllAndOverride: () => isPublic } as unknown as Reflector;
}

function verifierReturning(sub: string | Error): ClerkTokenVerifier {
  return {
    verify: async () => {
      if (sub instanceof Error) throw sub;
      return { sub };
    },
  } as unknown as ClerkTokenVerifier;
}

function tenantRepoReturning(tenantId: string): ITenantRepository {
  return {
    getOrCreateDefaultTenant: async () => ({ id: tenantId }),
  } as unknown as ITenantRepository;
}

function cacheReturning(value: string | null = null) {
  return {
    get: async () => value,
    setNxValue: async () => true,
  };
}

describe("ClerkAuthGuard", () => {
  test("allows routes marked public without a token", async () => {
    const guard = new ClerkAuthGuard(
      reflectorReturning(true),
      verifierReturning("ignored"),
      tenantRepoReturning("tenant"),
      cacheReturning() as any,
    );
    assert.equal(await guard.canActivate(contextFor({ headers: {} })), true);
  });

  test("rejects requests without an Authorization header", async () => {
    const guard = new ClerkAuthGuard(
      reflectorReturning(false),
      verifierReturning("user_1"),
      tenantRepoReturning("tenant"),
      cacheReturning() as any,
    );
    await assert.rejects(
      () => guard.canActivate(contextFor({ headers: {} })),
      UnauthorizedException,
    );
  });

  test("rejects a malformed Authorization header", async () => {
    const guard = new ClerkAuthGuard(
      reflectorReturning(false),
      verifierReturning("user_1"),
      tenantRepoReturning("tenant"),
      cacheReturning() as any,
    );
    await assert.rejects(
      () => guard.canActivate(contextFor({ headers: { authorization: "Basic abc" } })),
      UnauthorizedException,
    );
  });

  test("rejects an invalid session token", async () => {
    const guard = new ClerkAuthGuard(
      reflectorReturning(false),
      verifierReturning(new Error("bad signature")),
      tenantRepoReturning("tenant"),
      cacheReturning() as any,
    );
    await assert.rejects(
      () => guard.canActivate(contextFor({ headers: { authorization: "Bearer nope" } })),
      UnauthorizedException,
    );
  });

  test("maps the token subject to the user's tenant, ignoring x-tenant-id", async () => {
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: "Bearer valid", "x-tenant-id": "attacker-controlled" },
    };
    const guard = new ClerkAuthGuard(
      reflectorReturning(false),
      verifierReturning("user_real"),
      tenantRepoReturning("tenant_uuid"),
      cacheReturning() as any,
    );
    assert.equal(await guard.canActivate(contextFor(request)), true);
    assert.equal(request.tenantId, "tenant_uuid");
    assert.equal(request.userId, "user_real");
  });

  test("uses the cached tenant id without hitting the repository", async () => {
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: "Bearer valid" },
    };
    const repo = {
      getOrCreateDefaultTenant: async () => {
        throw new Error("repository should not be called on cache hit");
      },
    } as unknown as ITenantRepository;
    const guard = new ClerkAuthGuard(
      reflectorReturning(false),
      verifierReturning("user_real"),
      repo,
      cacheReturning("cached_tenant") as any,
    );
    assert.equal(await guard.canActivate(contextFor(request)), true);
    assert.equal(request.tenantId, "cached_tenant");
  });
});
