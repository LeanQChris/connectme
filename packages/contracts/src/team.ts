import { z } from "zod";

export const UserRoleSchema = z.enum(["owner", "admin", "agent", "viewer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const TeamMemberDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  role: UserRoleSchema,
  createdAt: z.string(),
});
export type TeamMemberDto = z.infer<typeof TeamMemberDtoSchema>;

export const InviteTeamMemberSchema = z.object({
  email: z.string().email("Valid email address is required"),
  role: UserRoleSchema.default("agent"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
export type InviteTeamMemberDto = z.infer<typeof InviteTeamMemberSchema>;

export const UpdateTeamMemberRoleSchema = z.object({
  role: UserRoleSchema,
});
export type UpdateTeamMemberRoleDto = z.infer<typeof UpdateTeamMemberRoleSchema>;

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    label: string;
    description: string;
    badge: string;
    canManageBilling: boolean;
    canManageChannels: boolean;
    canManageAiKeys: boolean;
    canManageTeam: boolean;
    canReplyMessages: boolean;
    canPostScheduled: boolean;
    canViewInbox: boolean;
  }
> = {
  owner: {
    label: "Owner",
    description: "Full administrative and billing access. Can manage organization, delete data, and invite admins.",
    badge: "👑 Owner",
    canManageBilling: true,
    canManageChannels: true,
    canManageAiKeys: true,
    canManageTeam: true,
    canReplyMessages: true,
    canPostScheduled: true,
    canViewInbox: true,
  },
  admin: {
    label: "Admin",
    description: "Can configure channels, manage AI BYOK keys, invite agents, and view all analytics.",
    badge: "🛡️ Admin",
    canManageBilling: false,
    canManageChannels: true,
    canManageAiKeys: true,
    canManageTeam: true,
    canReplyMessages: true,
    canPostScheduled: true,
    canViewInbox: true,
  },
  agent: {
    label: "Support Agent",
    description: "Can view and reply to conversations, use AI Smart Replies, schedule posts, and add internal notes.",
    badge: "💬 Agent",
    canManageBilling: false,
    canManageChannels: false,
    canManageAiKeys: false,
    canManageTeam: false,
    canReplyMessages: true,
    canPostScheduled: true,
    canViewInbox: true,
  },
  viewer: {
    label: "Read-Only Viewer",
    description: "Can view inbox threads, stats, and scheduling calendar without replying or editing.",
    badge: "👁️ Viewer",
    canManageBilling: false,
    canManageChannels: false,
    canManageAiKeys: false,
    canManageTeam: false,
    canReplyMessages: false,
    canPostScheduled: false,
    canViewInbox: true,
  },
};
