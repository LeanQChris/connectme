import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ClerkTokenVerifier } from "./clerk-token-verifier.service";
import { REQUIRED_ROLES_KEY } from "./require-roles.decorator";
import { TenantMembershipService } from "./tenant-membership.service";

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  tenantId?: string;
  userId?: string;
  userRole?: string;
}

/** Verifies the session and resolves current membership; headers cannot select a tenant. */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: ClerkTokenVerifier,
    private readonly membership: TenantMembershipService,
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

    const session = await this.verifier.verify(token);
    const member = await this.membership.resolve(session.sub);
    request.userId = member.id;
    request.tenantId = member.tenantId;
    request.userRole = member.role;
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (requiredRoles?.length && !requiredRoles.includes(member.role)) {
      throw new ForbiddenException("Your role does not have access to this action.");
    }
    // All other mutation routes require at least agent access. This also protects
    // future write endpoints unless they explicitly declare their allowed roles.
    const method = context.switchToHttp().getRequest<{ method?: string }>().method;
    if (member.role === "viewer" && method && !["GET", "HEAD", "OPTIONS"].includes(method) && !requiredRoles?.includes("viewer")) {
      throw new ForbiddenException("Viewers cannot change workspace data.");
    }
    return true;
  }
}
