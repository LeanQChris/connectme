"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
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
  const { userId } = useAuth();
  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isOwner = members.find((member) => member.id === userId)?.role === "owner";

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
    const pending = members.find((member) => member.id === memberId)?.status === "pending";
    if (!confirm(pending ? "Revoke this invitation?" : "Remove this member's workspace access?")) return;
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Team members</h2>
              <span className="rounded-full border border-hairline bg-canvas-elevated px-2 py-0.5 text-xs font-medium text-body">
                {members.length}
              </span>
            </div>
            <p className="text-sm text-body">Invite people and manage their access to this workspace.</p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="h-9 shrink-0 px-4 text-sm font-semibold"
          >
            Invite member
          </Button>
        </div>

        {error && (
          <div role="alert" className="flex items-center justify-between rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" className="px-1 text-base">×</button>
          </div>
        )}

        {success && (
          <div role="status" className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <span>✓ {success}</span>
            <button type="button" onClick={() => setSuccess(null)} aria-label="Dismiss message" className="px-1 text-base">×</button>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-hairline bg-canvas-elevated">
          <div className="border-b border-hairline px-5 py-4">
            <h3 className="text-sm font-semibold text-ink">Workspace directory</h3>
            <p className="mt-0.5 text-xs text-mute">Roles control which workspace tools each member can use.</p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-well/60" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-ink">No team members yet</p>
                <p className="mt-1 text-sm text-mute">Invite a teammate to start working together.</p>
              </div>
            ) : (
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface-well/40 text-xs font-medium text-mute">
                    <th scope="col" className="px-5 py-3">Member</th>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3">Access</th>
                    <th scope="col" className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                {members.map((m) => {
                  const roleStyle = ROLE_BADGE_STYLES[m.role] || ROLE_BADGE_STYLES.agent;
                  const perm = ROLE_PERMISSIONS[m.role];
                  const fullName = [m.firstName, m.lastName].filter(Boolean).join(" ");
                  const initials = (m.firstName?.[0] || m.email[0] || "U").toUpperCase();

                  return (
                    <tr key={m.id} className="transition-colors hover:bg-surface-well/30">
                      {/* Name / Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-well text-ink text-xs font-semibold">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-ink block truncate">
                              {fullName || m.email.split("@")[0]}
                            </span>
                            <span className="block truncate text-xs text-mute">
                              {m.email}
                            </span>
                            {m.status === "pending" && <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Invitation pending</span>}
                          </div>
                        </div>
                      </td>

                      {/* Role Selector */}
                      <td className="px-4 py-3.5">
                        <select
                          value={m.role}
                          disabled={updatingMemberId === m.id || m.status === "pending" || (!isOwner && (m.role === "owner" || m.role === "admin"))}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                          aria-label={`Role for ${fullName || m.email}`}
                          className={`rounded-md border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${roleStyle} ${updatingMemberId === m.id ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                        >
                          <option value="owner" disabled={!isOwner}>{ROLE_PERMISSIONS.owner.label}</option>
                          <option value="admin" disabled={!isOwner}>{ROLE_PERMISSIONS.admin.label}</option>
                          <option value="agent">{ROLE_PERMISSIONS.agent.label}</option>
                          <option value="viewer">{ROLE_PERMISSIONS.viewer.label}</option>
                        </select>
                      </td>

                      {/* Permissions description */}
                      <td className="px-4 py-3.5">
                        <p className="max-w-xs text-xs leading-relaxed text-mute">
                          {perm?.description || "Team member"}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        {m.role !== "owner" && (
                          <button
                            type="button"
                            disabled={updatingMemberId === m.id || (!isOwner && m.role === "admin")}
                            onClick={() => handleRemove(m.id)}
                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                          >
                            {m.status === "pending" ? "Revoke invitation" : "Remove"}
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
        </section>

        <section className="overflow-hidden rounded-xl border border-hairline bg-canvas-elevated">
          <div className="border-b border-hairline px-5 py-4">
            <h3 className="text-sm font-semibold text-ink">Role permissions</h3>
            <p className="mt-0.5 text-xs text-mute">Compare access levels before assigning a role.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-hairline bg-surface-well/40 text-[11px] font-medium text-mute">
                  <th scope="col" className="px-5 py-3">Role</th>
                  <th scope="col" className="px-3 py-3 text-center">Billing</th>
                  <th scope="col" className="px-3 py-3 text-center">Channels</th>
                  <th scope="col" className="px-3 py-3 text-center">AI keys</th>
                  <th scope="col" className="px-3 py-3 text-center">Team</th>
                  <th scope="col" className="px-3 py-3 text-center">View inbox</th>
                  <th scope="col" className="px-3 py-3 text-center">Reply</th>
                  <th scope="col" className="px-3 py-3 text-center">Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((rKey) => {
                  const r = ROLE_PERMISSIONS[rKey];
                  const access = [
                    ["Billing", r.canManageBilling],
                    ["Channels", r.canManageChannels],
                    ["AI keys", r.canManageAiKeys],
                    ["Team", r.canManageTeam],
                    ["View inbox", r.canViewInbox],
                    ["Reply", r.canReplyMessages],
                    ["Schedule", r.canPostScheduled],
                  ] as const;
                  return (
                    <tr key={rKey}>
                      <th scope="row" className="px-5 py-3.5 text-left font-medium text-ink" title={r.description}>
                        {r.label}
                      </th>
                      {access.map(([label, allowed]) => (
                        <td key={label} aria-label={`${label}: ${allowed ? "allowed" : "not allowed"}`} className="px-3 py-3.5 text-center">
                          <span aria-hidden="true" className={allowed ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-mute/60"}>
                            {allowed ? "✓" : "—"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      {/* 3. Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-labelledby="invite-team-title" className="w-full max-w-md space-y-5 rounded-xl border border-hairline bg-canvas-elevated p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-hairline pb-4">
              <div>
                <h3 id="invite-team-title" className="text-base font-semibold text-ink">Invite a teammate</h3>
                <p className="mt-1 text-sm text-mute">They’ll get access to this workspace with the role you choose.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                aria-label="Close invite dialog"
                className="rounded-md px-2 py-1 text-mute hover:bg-surface-well hover:text-ink"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Email address <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@yourcompany.com"
                  className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    First name
                  </label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Sarah"
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Connor"
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Workspace role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink focus:border-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                >
                  {isOwner && <option value="admin">{ROLE_PERMISSIONS.admin.label}</option>}
                  <option value="agent">{ROLE_PERMISSIONS.agent.label}</option>
                  <option value="viewer">{ROLE_PERMISSIONS.viewer.label}</option>
                </select>
                <p className="mt-2 text-xs leading-relaxed text-mute">
                  {ROLE_PERMISSIONS[inviteRole].description}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  className="h-9 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={inviting}
                  className="h-9 px-4 text-sm font-semibold"
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
