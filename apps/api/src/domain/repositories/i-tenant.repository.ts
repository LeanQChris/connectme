import { Tenant, TenantCredential, ConnectedAccount, User, ChannelType } from "@connectme/database";

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  getOrCreateDefaultTenant(userId: string, email?: string, name?: string): Promise<Tenant>;
  getCredentials(tenantId: string): Promise<TenantCredential | null>;
  updateCredentials(tenantId: string, partial: Partial<TenantCredential>): Promise<TenantCredential>;
  findConnectedAccounts(tenantId: string): Promise<ConnectedAccount[]>;
  findAccountById(tenantId: string, accountId: string): Promise<ConnectedAccount | null>;
  saveConnectedAccount(account: Partial<ConnectedAccount>): Promise<ConnectedAccount>;
  removeConnectedAccount(tenantId: string, accountId: string): Promise<void>;
  findAccountByExternalId(channel: ChannelType, externalId: string): Promise<ConnectedAccount | null>;
  findUserById(userId: string): Promise<User | null>;
  saveUser(user: Partial<User>): Promise<User>;
}
