import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ClerkTokenVerifier } from "./clerk-token-verifier.service";

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  tenantId?: string;
}

/**
 * Global guard. Every HTTP route requires a valid Clerk session token unless
 * marked `@Public()`. The tenant id is derived from the verified token's `sub`
 * claim, never from a request header.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: ClerkTokenVerifier,
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
      request.tenantId = session.sub;
      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new UnauthorizedException("Invalid or expired session token.");
    }
  }
}
