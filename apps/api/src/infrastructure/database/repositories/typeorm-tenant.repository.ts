import { createHash } from "node:crypto";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Tenant,
  TenantCredential,
  ConnectedAccount,
  User,
  ChannelType,
} from "@connectme/database";
import { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";

@Injectable()
export class TypeOrmTenantRepository implements ITenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantCredential)
    private readonly credRepo: Repository<TenantCredential>,
    @InjectRepository(ConnectedAccount)
    private readonly accountRepo: Repository<ConnectedAccount>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { slug } });
  }

  async getOrCreateDefaultTenant(userId: string, email?: string, name?: string): Promise<Tenant> {
    return this.userRepo.manager.transaction(async (manager) => {
      // Concurrent first HTTP/socket requests must create exactly one workspace.
      await manager.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [userId]);
      const existing = await manager.findOne(User, { where: { id: userId }, relations: ["tenant"] });
      if (existing) {
        if (existing.disabledAt) throw new ForbiddenException("Your workspace access has been removed.");
        return existing.tenant;
      }
      const slug = `tenant-${createHash("sha256").update(userId).digest("hex")}`;
      const tenant = await manager.save(Tenant, manager.create(Tenant, {
        slug, name: name ? `${name}'s Organization` : "My Workspace",
      }));
      await manager.insert(User, {
        id: userId, tenantId: tenant.id, email: email || "unknown@connectme.local",
        firstName: name || "User", role: "owner",
      });
      return tenant;
    });
  }

  async getCredentials(tenantId: string): Promise<TenantCredential | null> {
    return this.credRepo.findOne({ where: { tenantId } });
  }

  async updateCredentials(tenantId: string, partial: Partial<TenantCredential>): Promise<TenantCredential> {
    let creds = await this.credRepo.findOne({ where: { tenantId } });
    if (!creds) {
      creds = this.credRepo.create({ tenantId, ...partial });
    } else {
      Object.assign(creds, partial);
    }
    return this.credRepo.save(creds);
  }

  async findConnectedAccounts(tenantId: string): Promise<ConnectedAccount[]> {
    return this.accountRepo.find({ where: { tenantId, isActive: true } });
  }

  async findAccountById(tenantId: string, accountId: string): Promise<ConnectedAccount | null> {
    return this.accountRepo.findOne({ where: { tenantId, id: accountId } });
  }

  async saveConnectedAccount(account: Partial<ConnectedAccount>): Promise<ConnectedAccount> {
    if (account.id && account.tenantId) {
      const existing = await this.accountRepo.findOne({
        where: { id: account.id, tenantId: account.tenantId },
      });
      if (!existing) throw new Error("Connected account not found for tenant.");
    }
    return this.accountRepo.save(account);
  }

  async removeConnectedAccount(tenantId: string, accountId: string): Promise<void> {
    await this.accountRepo.delete({ id: accountId, tenantId });
  }

  async findAccountByExternalId(
    channel: ChannelType,
    externalId: string,
    provider?: string,
  ): Promise<ConnectedAccount | null> {
    return this.accountRepo.findOne({
      where: { channel, externalId, isActive: true, ...(provider ? { provider } : {}) },
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async saveUser(user: Partial<User>): Promise<User> {
    // Do not overwrite an existing membership during concurrent invitation claims.
    await this.userRepo.createQueryBuilder().insert().into(User).values(user).orIgnore().execute();
    return this.userRepo.findOneByOrFail({ id: user.id! });
  }
}
