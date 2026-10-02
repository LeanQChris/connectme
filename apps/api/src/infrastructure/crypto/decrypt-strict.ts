import { InternalServerErrorException } from "@nestjs/common";
import type { AesVaultService } from "@connectme/channels";

/**
 * Decrypt a stored tenant secret, failing loudly instead of silently passing
 * ciphertext through to third-party providers (which previously happened with
 * `decrypt(blob) || blob`).
 */
export function decryptStrict(vault: AesVaultService, blob: string): string {
  const value = vault.decrypt<string>(blob);
  if (typeof value !== "string" || value.length === 0) {
    throw new InternalServerErrorException(
      "Stored credential could not be decrypted. Verify ENCRYPTION_KEY matches the one used to save it.",
    );
  }
  return value;
}
