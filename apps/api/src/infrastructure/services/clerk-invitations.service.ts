import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createClerkClient } from "@clerk/backend";
import type { Invitation } from "@clerk/backend";

@Injectable()
export class ClerkInvitationsService {
  private client() {
    if (!process.env.CLERK_SECRET_KEY) throw new ServiceUnavailableException("Team invitations are not configured.");
    return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }

  async list(tenantId: string, query?: string): Promise<Invitation[]> {
    try {
      const client = this.client();
      const matches: Invitation[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await client.invitations.getInvitationList({ query, status: "pending", limit: 100, offset });
        matches.push(...page.data.filter((invite) => invite.publicMetadata?.connectmeTenantId === tenantId));
        if (offset + page.data.length >= page.totalCount || page.data.length === 0) return matches;
      }
    } catch {
      throw new ServiceUnavailableException("Team invitations are temporarily unavailable. Please retry.");
    }
  }

  async create(params: Parameters<ReturnType<typeof createClerkClient>["invitations"]["createInvitation"]>[0]) {
    try {
      return await this.client().invitations.createInvitation(params);
    } catch (error) {
      if (typeof error === "object" && error && "status" in error && error.status === 422) {
        throw new ServiceUnavailableException("This email may already have an account or pending invitation. Check the team directory before retrying.");
      }
      throw new ServiceUnavailableException("The invitation could not be sent. Please retry.");
    }
  }

  async revoke(id: string) {
    try {
      await this.client().invitations.revokeInvitation(id);
    } catch {
      throw new ServiceUnavailableException("The invitation could not be revoked. Please retry.");
    }
  }
}
