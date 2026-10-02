import { Injectable } from "@nestjs/common";
import { encryptPayload, decryptPayload } from "@connectme/crypto";
import { ProviderSecretsDto } from "@connectme/contracts";

@Injectable()
export class AesVaultService {
  private readonly masterKey: string;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        "ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` and set it identically for the API and worker.",
      );
    }
    this.masterKey = key;
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
