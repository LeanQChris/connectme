import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route as reachable without a Clerk session token.
 * Reserved for provider webhooks and other signature-verified endpoints.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
