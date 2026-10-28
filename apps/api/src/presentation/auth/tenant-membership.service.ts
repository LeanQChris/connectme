import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { User } from "@connectme/database";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { ClerkTokenVerifier } from "./clerk-token-verifier.service";

/** Shared by HTTP and sockets: membership always comes from the current database row. */
@Injectable()
export class TenantMembershipService {
  constructor(
    @Inject("ITenantRepository") private readonly tenants: ITenantRepository,
    private readonly clerk: ClerkTokenVerifier,
  ) {}

  async resolve(userId: string): Promise<User> {
    let member = await this.tenants.findUserById(userId);
    if (!member) {
      // Never create a default workspace when the identity provider is unavailable:
      // an accepted invitation must retain its original workspace and role.
      const profile = await this.clerk.getProfile(userId);
      const primaryEmail = profile.primaryEmailAddress;
      if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
        throw new ForbiddenException("Verify your email before accessing this workspace.");
      }
      const metadata = profile.publicMetadata as Record<string, unknown>;
      const target = metadata.connectmeTenantId;
      if (typeof target === "string") {
        if (!(await this.tenants.findById(target))) {
          throw new ForbiddenException("The invited workspace is no longer available.");
        }
        const role = String(metadata.connectmeRole || "agent");
        if (!["admin", "agent", "viewer"].includes(role)) {
          throw new ForbiddenException("The invitation has an invalid role.");
        }
        member = await this.tenants.saveUser({
          id: userId, tenantId: target, email: primaryEmail.emailAddress.toLowerCase(),
          firstName: profile.firstName, lastName: profile.lastName,
          avatarUrl: profile.imageUrl, role,
        });
      } else {
        await this.tenants.getOrCreateDefaultTenant(userId, primaryEmail.emailAddress.toLowerCase(), profile.firstName || undefined);
        member = await this.tenants.findUserById(userId);
      }
    }
    if (!member || member.disabledAt || !["owner", "admin", "agent", "viewer"].includes(member.role)) {
      throw new ForbiddenException("Your workspace access has been removed.");
    }
    return member;
  }
}
