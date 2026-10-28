import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, IsNull, Repository } from "typeorm";
import { User, Tenant } from "@connectme/database";
import type { TeamMemberDto, InviteTeamMemberDto, UpdateTeamMemberRoleDto, UserRole } from "@connectme/contracts";
import { ClerkInvitationsService } from "./clerk-invitations.service";
import { InboxRealtimeGateway } from "../../presentation/gateways/inbox-realtime.gateway";

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly invitations: ClerkInvitationsService,
    private readonly gateway: InboxRealtimeGateway,
  ) {}

  private memberDto(user: User): TeamMemberDto {
    return {
      id: user.id, tenantId: user.tenantId, email: user.email,
      firstName: user.firstName ?? null, lastName: user.lastName ?? null,
      avatarUrl: user.avatarUrl ?? null, role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(), status: "active",
    };
  }

  async listMembers(tenantId: string): Promise<TeamMemberDto[]> {
    const users = await this.userRepo.find({ where: { tenantId, disabledAt: IsNull() }, order: { createdAt: "ASC" } });
    const pending = await this.invitations.list(tenantId);
    return [...users.map((user) => this.memberDto(user)), ...pending.map((invite): TeamMemberDto => ({
      id: invite.id, tenantId, email: invite.emailAddress,
      firstName: String(invite.publicMetadata?.connectmeFirstName || "") || null,
      lastName: String(invite.publicMetadata?.connectmeLastName || "") || null,
      avatarUrl: null,
      role: (["admin", "agent", "viewer"].includes(String(invite.publicMetadata?.connectmeRole)) ? invite.publicMetadata?.connectmeRole : "agent") as UserRole,
      createdAt: new Date(invite.createdAt).toISOString(), status: "pending",
    }))];
  }

  private assertManager(actor: User | null, targetRole?: string, nextRole?: string) {
    if (!actor || actor.disabledAt || !["owner", "admin"].includes(actor.role)) {
      throw new ForbiddenException("Team management requires owner or admin access.");
    }
    if (actor.role !== "owner" && [targetRole, nextRole].some((role) => role === "owner" || role === "admin")) {
      throw new ForbiddenException("Only an owner can manage owners and admins.");
    }
  }

  async inviteMember(tenantId: string, dto: InviteTeamMemberDto, actorId: string): Promise<TeamMemberDto> {
    const actor = await this.userRepo.findOne({ where: { id: actorId, tenantId } });
    this.assertManager(actor, undefined, dto.role);
    if (dto.role === "owner") throw new BadRequestException("Invite a teammate first, then grant owner access after they join.");
    if (!(await this.tenantRepo.findOneBy({ id: tenantId }))) throw new NotFoundException("Workspace not found.");
    const email = dto.email.toLowerCase().trim();
    // Identity lookup is global because each Clerk identity has one membership;
    // never move an existing identity into the caller's workspace.
    if (await this.userRepo.findOne({ where: { email } })) {
      throw new BadRequestException("This email already belongs to a workspace account.");
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const invitation = await this.invitations.create({
      emailAddress: email, expiresInDays: 7,
      redirectUrl: new URL("/sign-up", appUrl).toString(),
      publicMetadata: {
        connectmeTenantId: tenantId, connectmeRole: dto.role,
        connectmeFirstName: dto.firstName || "", connectmeLastName: dto.lastName || "",
      },
    });
    return {
      id: invitation.id, tenantId, email, firstName: dto.firstName || null,
      lastName: dto.lastName || null, avatarUrl: null, role: dto.role,
      createdAt: new Date(invitation.createdAt).toISOString(), status: "pending",
    };
  }

  private async lockWorkspace(manager: EntityManager, tenantId: string) {
    const tenant = await manager.findOne(Tenant, { where: { id: tenantId }, lock: { mode: "pessimistic_write" } });
    if (!tenant) throw new NotFoundException("Workspace not found.");
  }

  async updateRole(tenantId: string, memberId: string, dto: UpdateTeamMemberRoleDto, actorId: string): Promise<TeamMemberDto> {
    return this.userRepo.manager.transaction(async (manager) => {
      await this.lockWorkspace(manager, tenantId);
      const user = await manager.findOne(User, { where: { id: memberId, tenantId, disabledAt: IsNull() } });
      if (!user) throw new NotFoundException("Active team member not found. Revoke and resend a pending invitation to change its role.");
      const actor = await manager.findOne(User, { where: { id: actorId, tenantId } });
      this.assertManager(actor, user.role, dto.role);
      if (user.role === "owner" && dto.role !== "owner" && await manager.count(User, { where: { tenantId, role: "owner", disabledAt: IsNull() } }) <= 1) {
        throw new ForbiddenException("Cannot demote the only workspace owner.");
      }
      user.role = dto.role;
      return this.memberDto(await manager.save(User, user));
    });
  }

  async removeMember(tenantId: string, memberId: string, actorId: string): Promise<{ success: boolean }> {
    const removed = await this.userRepo.manager.transaction(async (manager) => {
      await this.lockWorkspace(manager, tenantId);
      const actor = await manager.findOne(User, { where: { id: actorId, tenantId } });
      const user = await manager.findOne(User, { where: { id: memberId, tenantId, disabledAt: IsNull() } });
      this.assertManager(actor, user?.role);
      if (!user) return false;
      if (user.role === "owner" && await manager.count(User, { where: { tenantId, role: "owner", disabledAt: IsNull() } }) <= 1) {
        throw new ForbiddenException("Cannot remove the only workspace owner.");
      }
      // Preserve a tombstone so stale Clerk metadata cannot recreate membership.
      user.disabledAt = new Date();
      await manager.save(User, user);
      return true;
    });
    if (removed) {
      this.gateway.disconnectMember(memberId);
    } else {
      const invitation = (await this.invitations.list(tenantId, memberId)).find((invite) => invite.id === memberId);
      if (!invitation) throw new NotFoundException("Team member not found.");
      const actor = await this.userRepo.findOne({ where: { id: actorId, tenantId } });
      this.assertManager(actor, String(invitation.publicMetadata?.connectmeRole));
      await this.invitations.revoke(memberId);
    }
    return { success: true };
  }
}
