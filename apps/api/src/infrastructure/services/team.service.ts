import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, Tenant } from "@connectme/database";
import type {
  TeamMemberDto,
  InviteTeamMemberDto,
  UpdateTeamMemberRoleDto,
  UserRole,
} from "@connectme/contracts";

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  public async listMembers(tenantId: string): Promise<TeamMemberDto[]> {
    const users = await this.userRepo.find({
      where: { tenantId },
      order: { createdAt: "ASC" },
    });

    return users.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      email: u.email,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      avatarUrl: u.avatarUrl ?? null,
      role: (u.role || "agent") as UserRole,
      createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
    }));
  }

  public async inviteMember(
    tenantId: string,
    dto: InviteTeamMemberDto,
  ): Promise<TeamMemberDto> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }

    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing && existing.tenantId === tenantId) {
      throw new BadRequestException("This user is already a member of your team.");
    }

    // Generate a clerk/system user ID if user doesn't exist yet
    const userId = existing?.id || `user_inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let user: User;
    if (existing) {
      existing.tenantId = tenantId;
      existing.role = dto.role || "agent";
      if (dto.firstName) existing.firstName = dto.firstName;
      if (dto.lastName) existing.lastName = dto.lastName;
      user = await this.userRepo.save(existing);
    } else {
      user = this.userRepo.create({
        id: userId,
        tenantId,
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        role: dto.role || "agent",
      });
      user = await this.userRepo.save(user);
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: (user.role || "agent") as UserRole,
      createdAt: user.createdAt.toISOString(),
    };
  }

  public async updateRole(
    tenantId: string,
    memberId: string,
    dto: UpdateTeamMemberRoleDto,
  ): Promise<TeamMemberDto> {
    const user = await this.userRepo.findOne({
      where: { id: memberId, tenantId },
    });

    if (!user) {
      throw new NotFoundException("Team member not found.");
    }

    // Protect last owner
    if (user.role === "owner" && dto.role !== "owner") {
      const ownerCount = await this.userRepo.count({
        where: { tenantId, role: "owner" },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException("Cannot demote the only organization owner.");
      }
    }

    user.role = dto.role;
    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      email: saved.email,
      firstName: saved.firstName ?? null,
      lastName: saved.lastName ?? null,
      avatarUrl: saved.avatarUrl ?? null,
      role: saved.role as UserRole,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  public async removeMember(
    tenantId: string,
    memberId: string,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepo.findOne({
      where: { id: memberId, tenantId },
    });

    if (!user) {
      throw new NotFoundException("Team member not found.");
    }

    if (user.role === "owner") {
      const ownerCount = await this.userRepo.count({
        where: { tenantId, role: "owner" },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException("Cannot remove the only organization owner.");
      }
    }

    await this.userRepo.remove(user);
    return { success: true };
  }
}
