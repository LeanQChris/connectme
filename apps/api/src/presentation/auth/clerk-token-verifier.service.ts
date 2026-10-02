import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { verifyToken } from "@clerk/backend";

export interface VerifiedSession {
  sub: string;
}

/**
 * Thin injectable wrapper around Clerk's `verifyToken` so the auth guard can be
 * unit-tested without hitting Clerk's JWKS endpoint.
 */
@Injectable()
export class ClerkTokenVerifier {
  private readonly logger = new Logger(ClerkTokenVerifier.name);

  async verify(token: string): Promise<VerifiedSession> {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new ServiceUnavailableException(
        "CLERK_SECRET_KEY is not configured; cannot verify session tokens.",
      );
    }

    try {
      const payload = await verifyToken(token, { secretKey });
      if (!payload?.sub || typeof payload.sub !== "string") {
        throw new UnauthorizedException("Session token is missing a subject.");
      }
      return { sub: payload.sub };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.debug(`Token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException("Invalid or expired session token.");
    }
  }
}
