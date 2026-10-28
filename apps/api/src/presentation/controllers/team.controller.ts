import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { TeamService } from "../../infrastructure/services/team.service";
import { RequireRoles } from "../auth/require-roles.decorator";
import { TenantId } from "../auth/tenant-id.decorator";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import {
  InviteTeamMemberSchema,
  UpdateTeamMemberRoleSchema,
  type InviteTeamMemberDto,
  type UpdateTeamMemberRoleDto,
} from "@connectme/contracts";

@Controller("api/team")
@RequireRoles("owner", "admin")
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get("members")
  async listMembers(@TenantId() tenantId: string) {
    const members = await this.teamService.listMembers(tenantId);
    return { members };
  }

  @Post("invite")
  async inviteMember(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(InviteTeamMemberSchema)) dto: InviteTeamMemberDto,
    @Req() request: Request & { userId: string },
  ) {
    const member = await this.teamService.inviteMember(tenantId, dto, request.userId);
    return { member };
  }

  @Patch("members/:id/role")
  async updateRole(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateTeamMemberRoleSchema)) dto: UpdateTeamMemberRoleDto,
    @Req() request: Request & { userId: string },
  ) {
    const member = await this.teamService.updateRole(tenantId, id, dto, request.userId);
    return { member };
  }

  @Delete("members/:id")
  async removeMember(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Req() request: Request & { userId: string },
  ) {
    return this.teamService.removeMember(tenantId, id, request.userId);
  }
}
