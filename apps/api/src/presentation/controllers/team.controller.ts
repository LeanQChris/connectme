import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from "@nestjs/common";
import { TeamService } from "../../infrastructure/services/team.service";
import { TenantId } from "../auth/tenant-id.decorator";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import {
  InviteTeamMemberSchema,
  UpdateTeamMemberRoleSchema,
  type InviteTeamMemberDto,
  type UpdateTeamMemberRoleDto,
} from "@connectme/contracts";

@Controller("api/team")
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
  ) {
    const member = await this.teamService.inviteMember(tenantId, dto);
    return { member };
  }

  @Patch("members/:id/role")
  async updateRole(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateTeamMemberRoleSchema)) dto: UpdateTeamMemberRoleDto,
  ) {
    const member = await this.teamService.updateRole(tenantId, id, dto);
    return { member };
  }

  @Delete("members/:id")
  async removeMember(
    @TenantId() tenantId: string,
    @Param("id") id: string,
  ) {
    return this.teamService.removeMember(tenantId, id);
  }
}
