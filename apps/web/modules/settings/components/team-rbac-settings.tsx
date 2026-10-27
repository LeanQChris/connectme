"use client";

import { useState, useEffect } from "react";
import { teamApi } from "../api/team.api";
import type { TeamMemberDto, UserRole } from "@connectme/contracts";
import { ROLE_PERMISSIONS } from "@connectme/contracts";
import { Button } from "@/components/ui/button";

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  owner: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold",
  admin: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold",
  agent: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium",
  viewer: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 font-medium",
};

export function TeamRbacSettings() {
  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("agent");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviting, setInviting] = useState(false);

  // Active role editing
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    teamApi
      .listMembers()
      .then((list) => {
        if (!ignore) {
          setMembers(list);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load team members");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    setUpdatingMemberId(memberId);
    setError(null);
    try {
      const res = await teamApi.updateRole(memberId, newRole);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? res.member : m)));
      setSuccess("Member role updated!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    setUpdatingMemberId(memberId);
    setError(null);
    try {
      await teamApi.removeMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSuccess("Member removed from team.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    try {
      const res = await teamApi.inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        firstName: inviteFirstName.trim() || undefined,
        lastName: inviteLastName.trim() || undefined,
      });
      setMembers((prev) => [res.member, ...prev.filter((m) => m.id !== res.member.id)]);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteRole("agent");
      setSuccess("Invitation sent successfully!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Team Directory */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-well border border-hairline text-ink shadow-2xs">
              <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">
                  Team Members & RBAC Roles
                </h2>
                <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-mute border border-hairline">
                  {members.length} Members
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Manage organization members, assign roles (Owner, Admin, Agent, Viewer), and invite collaborators.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="h-8 px-3.5 text-[12px] font-semibold shrink-0 cursor-pointer"
          >
            + Invite Member
          </Button>
        </div>

        {error && (
          <div className="m-6 rounded-xl border border-error/30 bg-error/10 p-3.5 text-[12.5px] text-error flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="cursor-pointer">✕</button>
          </div>
        )}

        {success && (
          <div className="m-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-[12.5px] text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <span>✓ {success}</span>
            <button type="button" onClick={() => setSuccess(null)} className="cursor-pointer">✕</button>
          </div>
        )}

        {/* Member Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg border border-hairline bg-surface-well/50" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-mute text-[13px]">
              No members found in this team.
            </div>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-surface-well/30 font-mono text-[10.5px] uppercase tracking-wider text-mute">
                  <th className="py-3 px-6">User / Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-canvas">
                {members.map((m) => {
                  const roleStyle = ROLE_BADGE_STYLES[m.role] || ROLE_BADGE_STYLES.agent;
                  const perm = ROLE_PERMISSIONS[m.role];
                  const fullName = [m.firstName, m.lastName].filter(Boolean).join(" ");
                  const initials = (m.firstName?.[0] || m.email[0] || "U").toUpperCase();

                  return (
                    <tr key={m.id} className="group hover:bg-surface-well/30 transition-colors">
                      {/* Name / Email */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-well border border-hairline text-ink font-semibold text-xs shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-ink block truncate">
                              {fullName || m.email.split("@")[0]}
                            </span>
                            <span className="font-mono text-[11px] text-mute block truncate">
                              {m.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Selector */}
                      <td className="py-3.5 px-4">
                        <select
                          value={m.role}
                          disabled={updatingMemberId === m.id}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                          className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] cursor-pointer focus:outline-none ${roleStyle}`}
                        >
                          <option value="owner">👑 Owner</option>
                          <option value="admin">🛡️ Admin</option>
                          <option value="agent">💬 Agent</option>
                          <option value="viewer">👁️ Viewer</option>
                        </select>
                      </td>

                      {/* Permissions description */}
                      <td className="py-3.5 px-4">
                        <p className="max-w-xs text-[11.5px] text-mute leading-snug">
                          {perm?.description || "Team member"}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        {m.role !== "owner" && (
                          <button
                            type="button"
                            disabled={updatingMemberId === m.id}
                            onClick={() => handleRemove(m.id)}
                            className="rounded px-2.5 py-1 text-[11.5px] text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2. Permissions Matrix Reference Card */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-6 shadow-2xs space-y-4">
        <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-mute">
          Role Permissions Matrix Reference
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((rKey) => {
            const r = ROLE_PERMISSIONS[rKey];
            return (
              <div
                key={rKey}
                className="flex flex-col justify-between rounded-xl border border-hairline bg-canvas p-4 shadow-2xs space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-ink">{r.badge}</span>
                  </div>
                  <p className="text-[11.5px] text-mute leading-snug">{r.description}</p>
                </div>

                <div className="space-y-1.5 border-t border-hairline pt-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-mute">Channels & BYOK:</span>
                    <span className={r.canManageChannels ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-mute"}>
                      {r.canManageChannels ? "✓ Yes" : "✕ No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-mute">Reply to Inboxes:</span>
                    <span className={r.canReplyMessages ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-mute"}>
                      {r.canReplyMessages ? "✓ Yes" : "✕ No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-mute">Post Scheduling:</span>
                    <span className={r.canPostScheduled ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-mute"}>
                      {r.canPostScheduled ? "✓ Yes" : "✕ No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-mute">Team Management:</span>
                    <span className={r.canManageTeam ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-mute"}>
                      {r.canManageTeam ? "✓ Yes" : "✕ No"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-canvas-elevated p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-[15px] font-semibold text-ink">Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-mute hover:text-ink cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  Email Address <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@yourcompany.com"
                  className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-ink mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Sarah"
                    className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ink mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Connor"
                    className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  Select Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink focus:border-ink/50 focus:outline-none"
                >
                  <option value="admin">🛡️ Admin — Can manage channels, AI BYOK & team</option>
                  <option value="agent">💬 Support Agent — Can reply, schedule & add notes</option>
                  <option value="viewer">👁️ Viewer — Read-only access to inboxes & stats</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  className="h-8 px-3 text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={inviting}
                  className="h-8 px-4 text-[12px] font-semibold"
                >
                  {inviting ? "Inviting…" : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
