import { Injectable } from "@nestjs/common";
import { encryptPayload, decryptPayload } from "@connectme/crypto";
import { ProviderSecretsDto } from "@connectme/contracts";

@Injectable()
export class AesVaultService {
  private readonly masterKey: string;

  constructor() {
    this.masterKey =
      process.env.ENCRYPTION_KEY ||
      "dev-master-encryption-key-for-local-development-only-32ch";
  }

  encrypt<T = unknown>(data: T): string {
    return encryptPayload(data, this.masterKey);
  }

  decrypt<T = unknown>(encryptedBlob: string): T | null {
    return decryptPayload<T>(encryptedBlob, this.masterKey);
  }

  encryptSecrets(secrets: ProviderSecretsDto): string {
    return this.encrypt(secrets);
  }

  decryptSecrets(encryptedBlob: string): ProviderSecretsDto | null {
    return this.decrypt<ProviderSecretsDto>(encryptedBlob);
  }
}
