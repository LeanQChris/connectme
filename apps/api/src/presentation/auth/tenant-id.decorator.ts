import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Reads the tenant id resolved by ClerkAuthGuard from the verified session
 * token. Never read `x-tenant-id` directly: it is attacker-controlled.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ tenantId?: string }>();
    if (!request.tenantId) {
      throw new Error("TenantId used on a route without ClerkAuthGuard");
    }
    return request.tenantId;
  },
);
