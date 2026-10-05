"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCreateConversation, useSlackDirectory } from "@/lib/hooks/use-inbox";
import type { SlackDirectoryChannel, SlackDirectoryUser } from "@/lib/slack/client";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  teamName?: string | null;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onSelectConversation,
  teamName,
}: NewConversationModalProps) {
  const [activeTab, setActiveTab] = useState<"users" | "channels">("users");
  const [query, setQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const { data: directory, isLoading, isError, error } = useSlackDirectory(isOpen);
  const createConversation = useCreateConversation();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!directory?.users) return [];
    const q = query.trim().toLowerCase();
    if (!q) return directory.users;
    return directory.users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.title && u.title.toLowerCase().includes(q))
    );
  }, [directory?.users, query]);

  // Filter channels
  const filteredChannels = useMemo(() => {
    if (!directory?.channels) return [];
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) return directory.channels;
    return directory.channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.topic && c.topic.toLowerCase().includes(q))
    );
  }, [directory?.channels, query]);

  async function handleSelectUser(user: SlackDirectoryUser) {
    try {
      setCreatingId(user.id);
      const res = await createConversation.mutateAsync({
        channel: "slack",
        contactExternalId: user.id,
        contactName: user.displayName,
        avatarUrl: user.avatarUrl,
        accountName: teamName || undefined,
      });
      if (res?.conversation?.id) {
        onSelectConversation(res.conversation.id);
        onClose();
      }
    } catch (err) {
      console.error("Failed to create conversation with user:", err);
    } finally {
      setCreatingId(null);
    }
  }

  async function handleSelectChannel(channel: SlackDirectoryChannel) {
    try {
      setCreatingId(channel.id);
      const res = await createConversation.mutateAsync({
        channel: "slack",
        contactExternalId: channel.id,
        contactName: `#${channel.name}`,
        accountName: teamName || undefined,
      });
      if (res?.conversation?.id) {
        onSelectConversation(res.conversation.id);
        onClose();
      }
    } catch (err) {
      console.error("Failed to create conversation with channel:", err);
    } finally {
      setCreatingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative flex flex-col w-full max-w-[520px] max-h-[85vh] h-[580px] rounded-[14px] border border-hairline bg-canvas-elevated shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5 bg-canvas">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#4A154B] text-white text-[11px] font-bold shrink-0">
              #
            </span>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-ink truncate">
                New Slack Conversation
              </h3>
              {teamName && (
                <p className="text-[11px] text-mute font-mono truncate">
                  Workspace: {teamName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-surface-well hover:text-ink cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-hairline bg-canvas">
          <div className="relative flex items-center">
            <svg
              className="pointer-events-none absolute left-3 h-4 w-4 text-mute"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === "users"
                  ? "Search people by name, @handle or role…"
                  : "Search channels by #name…"
              }
              className="h-9 w-full rounded-[8px] border border-hairline bg-canvas-elevated pl-9 pr-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 text-[11px] text-mute hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hairline bg-surface-well/40 px-3 pt-2 gap-1 text-[12.5px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-[6px] border-b-2 transition-colors cursor-pointer ${
              activeTab === "users"
                ? "border-ink font-semibold text-ink bg-canvas-elevated"
                : "border-transparent text-mute hover:text-ink"
            }`}
          >
            <span>👥 Direct Messages</span>
            {directory?.users && (
              <span className="font-mono text-[10.5px] rounded-full bg-surface-well px-1.5 py-0.2 text-mute">
                {directory.users.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("channels")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-[6px] border-b-2 transition-colors cursor-pointer ${
              activeTab === "channels"
                ? "border-ink font-semibold text-ink bg-canvas-elevated"
                : "border-transparent text-mute hover:text-ink"
            }`}
          >
            <span>#️⃣ Channels</span>
            {directory?.channels && (
              <span className="font-mono text-[10.5px] rounded-full bg-surface-well px-1.5 py-0.2 text-mute">
                {directory.channels.length}
              </span>
            )}
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-canvas">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-mute gap-2">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-mute/30 border-t-ink" />
              <p className="text-[12.5px]">Loading workspace directory…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-error px-4 gap-1.5">
              <p className="text-[13px] font-semibold">Could not load Slack directory</p>
              <p className="text-[12px] text-mute max-w-sm">
                {error instanceof Error ? error.message : "Ensure Slack Bot token has channels:read and users:read scopes."}
              </p>
            </div>
          ) : activeTab === "users" ? (
            filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-mute text-[12.5px]">
                {query ? `No Slack members match “${query}”` : "No users found in workspace"}
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredUsers.map((user) => {
                  const isBusy = creatingId === user.id;
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        disabled={isBusy}
                        className="flex w-full items-center gap-3 rounded-[8px] p-2 text-left transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer group"
                      >
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[13px] font-bold text-primary overflow-hidden border border-hairline">
                          {user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            user.displayName.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-ink truncate group-hover:underline">
                              {user.displayName}
                            </span>
                            {user.isBot && (
                              <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded bg-surface-well text-mute">
                                Bot
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-mute">
                            <span className="font-mono truncate">@{user.name}</span>
                            {user.title && (
                              <>
                                <span>·</span>
                                <span className="truncate">{user.title}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-[11.5px] font-medium text-link opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {isBusy ? "Opening…" : "Message →"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : filteredChannels.length === 0 ? (
            <div className="py-16 text-center text-mute text-[12.5px]">
              {query ? `No channels match “#${query}”` : "No channels found in workspace"}
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredChannels.map((channel) => {
                const isBusy = creatingId === channel.id;
                return (
                  <li key={channel.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectChannel(channel)}
                      disabled={isBusy}
                      className="flex w-full items-center gap-3 rounded-[8px] p-2 text-left transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-surface-well font-mono font-bold text-ink text-[13px] border border-hairline">
                        {channel.isPrivate ? "🔒" : "#"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-ink truncate group-hover:underline">
                            #{channel.name}
                          </span>
                          {channel.isPrivate && (
                            <span className="font-mono text-[9.5px] text-amber-500/90 font-medium">
                              Private
                            </span>
                          )}
                        </div>
                        {channel.topic && (
                          <p className="text-[11px] text-mute truncate line-clamp-1">
                            {channel.topic}
                          </p>
                        )}
                      </div>

                      <span className="text-[11.5px] font-medium text-link opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {isBusy ? "Opening…" : "Open Channel →"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-hairline bg-surface-well/50 px-4 py-2 flex items-center justify-between text-[11px] text-mute">
          <span>Click any member or channel to start chatting</span>
          <span className="font-mono text-[10px]">Esc to close</span>
        </div>
      </div>
    </div>
  );
}
