import { randomBytes } from "node:crypto";
import type { ITenantRepository } from "../domain/repositories/i-tenant.repository";

/**
 * Returns the tenant's webhook verification token, minting and persisting one
 * on first use.
 *
 * Three places need the same value: the one shown in settings, the one handed
 * to Telegram's `setWebhook`, and the one checked on every inbound update. The
 * webhook handler deliberately rejects an update when no token is stored, so a
 * value that only exists in a response — or the old hardcoded
 * "connectme_verify_token" default — registers a webhook that can never
 * validate and leaves Telegram silently unable to deliver anything.
 *
 * Deriving it here keeps all three identical. It is idempotent: a tenant that
 * already has a token never generates a new one.
 *
 * Note this makes the settings GET lazily write on first read. That is a
 * deliberate trade: the alternative is showing a token that has never been
 * persisted, which is exactly the bug being fixed.
 */
export async function ensureWebhookVerifyToken(
  tenantRepo: ITenantRepository,
  tenantId: string,
  current?: string | null,
): Promise<string> {
  if (current) return current;

  const token = randomBytes(24).toString("hex");
  await tenantRepo.updateCredentials(tenantId, { webhookVerifyToken: token });
  return token;
}
