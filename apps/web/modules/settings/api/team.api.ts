import type {
  TeamMemberDto,
  InviteTeamMemberDto,
  UpdateTeamMemberRoleDto,
} from "@connectme/contracts";

export const teamApi = {
  async listMembers(): Promise<TeamMemberDto[]> {
    const res = await fetch("/api/team/members");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to load team members");
    }
    const data = await res.json();
    return data.members || [];
  },

  async inviteMember(dto: InviteTeamMemberDto): Promise<{ member: TeamMemberDto }> {
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to invite team member");
    }
    return res.json();
  },

  async updateRole(id: string, role: UpdateTeamMemberRoleDto["role"]): Promise<{ member: TeamMemberDto }> {
    const res = await fetch(`/api/team/members/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update member role");
    }
    return res.json();
  },

  async removeMember(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/team/members/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to remove member");
    }
    return res.json();
  },
};
