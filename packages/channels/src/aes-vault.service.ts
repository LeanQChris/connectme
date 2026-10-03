import { Injectable } from "@nestjs/common";
import { encryptPayload, decryptPayloadStrict, CryptoDecryptError } from "@connectme/crypto";
import { ProviderSecretsDto, ProviderSecretsSchema } from "@connectme/contracts";

const MIN_KEY_LENGTH = 32;

@Injectable()
export class AesVaultService {
  private readonly masterKey: string;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < MIN_KEY_LENGTH) {
      throw new Error(
        `ENCRYPTION_KEY is missing or too short (min ${MIN_KEY_LENGTH} chars). Generate one with \`openssl rand -hex 32\` and set it identically for the API and worker.`,
      );
    }
    this.masterKey = key;
  }

  encrypt<T = unknown>(data: T): string {
    return encryptPayload(data, this.masterKey);
  }

  decrypt<T = unknown>(encryptedBlob: string): T | null {
    try {
      return decryptPayloadStrict<T>(encryptedBlob, this.masterKey);
    } catch (err) {
      if (err instanceof CryptoDecryptError) return null;
      throw err;
    }
  }

  /** Decrypt or throw; never returns null so callers cannot forward ciphertext. */
  decryptStrict<T = unknown>(encryptedBlob: string): T {
    return decryptPayloadStrict<T>(encryptedBlob, this.masterKey);
  }

  encryptSecrets(secrets: ProviderSecretsDto): string {
    return this.encrypt(ProviderSecretsSchema.parse(secrets));
  }

  decryptSecrets(encryptedBlob: string): ProviderSecretsDto | null {
    const value = this.decrypt<unknown>(encryptedBlob);
    if (value === null) return null;
    const parsed = ProviderSecretsSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }
}
