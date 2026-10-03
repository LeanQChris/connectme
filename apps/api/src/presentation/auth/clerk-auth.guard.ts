import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ClerkTokenVerifier } from "./clerk-token-verifier.service";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { RedisService } from "../../infrastructure/redis/redis.service";

const TENANT_CACHE_TTL_SECONDS = 300;

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  tenantId?: string;
  userId?: string;
}

/**
 * Global guard. Every HTTP route requires a valid Clerk session token unless
 * marked `@Public()`. The tenant id is derived from the verified token's `sub`
 * claim (mapped through the user record), never from a request header.
 *
 * The `sub -> tenantId` mapping is cached in Redis (5 min) so most requests
 * avoid a database round-trip; the cache is fail-open (Redis down falls back
 * to Postgres).
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: ClerkTokenVerifier,
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers["authorization"];
    const value = Array.isArray(header) ? header[0] : header;

    if (!value || !value.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    const token = value.slice("Bearer ".length).trim();
    if (!token) throw new UnauthorizedException("Missing bearer token.");

    try {
      const session = await this.verifier.verify(token);
      request.userId = session.sub;
      request.tenantId = await this.resolveTenantId(session.sub);
      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new UnauthorizedException("Invalid or expired session token.");
    }
  }

  private async resolveTenantId(userId: string): Promise<string> {
    const cacheKey = `tenant:sub:${userId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return cached;
    } catch {
      /* cache miss on Redis failure; fall through to the database */
    }

    const tenant = await this.tenantRepo.getOrCreateDefaultTenant(userId);

    try {
      await this.redis.setNxValue(cacheKey, tenant.id, TENANT_CACHE_TTL_SECONDS);
    } catch {
      /* best-effort cache warm */
    }
    return tenant.id;
  }
}
