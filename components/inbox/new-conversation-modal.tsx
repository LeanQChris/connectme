"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCreateConversation, useSlackDirectory } from "@/lib/hooks/use-inbox";
import type { Channel, ConnectedAccount } from "@/lib/types";
import type { SlackDirectoryChannel, SlackDirectoryUser } from "@/lib/slack/client";
import { channelMeta } from "./channel-badge";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string, channel?: Channel) => void;
  initialChannel?: string;
  connected?: Record<string, boolean>;
  accounts?: ConnectedAccount[];
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onSelectConversation,
  initialChannel,
  connected = {},
  accounts = [],
}: NewConversationModalProps) {
  // Available channels
  const availableChannels = useMemo<Channel[]>(() => {
    const list: Channel[] = [];
    if (connected.slack || accounts.some((a) => a.channel === "slack")) list.push("slack");
    if (connected.whatsapp || accounts.some((a) => a.channel === "whatsapp")) list.push("whatsapp");
    if (connected.telegram || accounts.some((a) => a.channel === "telegram")) list.push("telegram");
    if (connected.discord || accounts.some((a) => a.channel === "discord")) list.push("discord");
    if (connected.messenger || accounts.some((a) => a.channel === "messenger")) list.push("messenger");
    if (connected.instagram || accounts.some((a) => a.channel === "instagram")) list.push("instagram");
    // Default fallback to slack and whatsapp if none explicitly connected
    if (list.length === 0) list.push("slack", "whatsapp", "telegram");
    return list;
  }, [connected, accounts]);

  const [selectedChannel, setSelectedChannel] = useState<Channel>(() => {
    if (initialChannel && initialChannel !== "archived" && availableChannels.includes(initialChannel as Channel)) {
      return initialChannel as Channel;
    }
    return availableChannels[0] || "slack";
  });

  // Reset selected channel when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialChannel && initialChannel !== "archived" && availableChannels.includes(initialChannel as Channel)) {
        setSelectedChannel(initialChannel as Channel);
      } else if (availableChannels.length > 0 && !availableChannels.includes(selectedChannel)) {
        setSelectedChannel(availableChannels[0]);
      }
    }
  }, [isOpen, initialChannel, availableChannels]);

  // Slack state
  const [slackTab, setSlackTab] = useState<"users" | "channels">("users");
  const [query, setQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  // Manual input state for WhatsApp / Telegram / Discord
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const { data: directory, isLoading: isSlackLoading, isError: isSlackError, error: slackError } =
    useSlackDirectory(isOpen && selectedChannel === "slack");
  
  const createConversation = useCreateConversation();

  const slackAccount = useMemo(
    () => accounts.find((a) => a.channel === "slack"),
    [accounts]
  );

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Filter Slack users
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

  // Filter Slack channels
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

  async function handleSelectSlackUser(user: SlackDirectoryUser) {
    try {
      setCreatingId(user.id);
      const res = await createConversation.mutateAsync({
        channel: "slack",
        contactExternalId: user.id,
        contactName: user.displayName,
        avatarUrl: user.avatarUrl,
        accountName: slackAccount?.name || undefined,
      });
      if (res?.conversation?.id) {
        onSelectConversation(res.conversation.id, "slack");
        onClose();
      }
    } catch (err) {
      console.error("Failed to create conversation with Slack user:", err);
    } finally {
      setCreatingId(null);
    }
  }

  async function handleSelectSlackChannel(channel: SlackDirectoryChannel) {
    try {
      setCreatingId(channel.id);
      const res = await createConversation.mutateAsync({
        channel: "slack",
        contactExternalId: channel.id,
        contactName: `#${channel.name}`,
        accountName: slackAccount?.name || undefined,
      });
      if (res?.conversation?.id) {
        onSelectConversation(res.conversation.id, "slack");
        onClose();
      }
    } catch (err) {
      console.error("Failed to create conversation with Slack channel:", err);
    } finally {
      setCreatingId(null);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualError(null);
    const cleanId = targetId.trim();
    if (!cleanId) {
      setManualError("Please provide a phone number, username, or ID");
      return;
    }

    try {
      setCreatingId(cleanId);
      const matchedAcc = accounts.find((a) => a.channel === selectedChannel);
      const res = await createConversation.mutateAsync({
        channel: selectedChannel,
        contactExternalId: cleanId,
        contactName: targetName.trim() || cleanId,
        accountId: matchedAcc?.id,
        accountName: matchedAcc?.name,
      });
      if (res?.conversation?.id) {
        onSelectConversation(res.conversation.id, selectedChannel);
        onClose();
      }
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to start conversation");
    } finally {
      setCreatingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative flex flex-col w-full max-w-[560px] max-h-[85vh] h-[600px] rounded-[14px] border border-hairline bg-canvas-elevated shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5 bg-canvas">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-hairline bg-surface-well font-bold text-ink shadow-2xs shrink-0">
              ✏️
            </span>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-ink truncate">
                New Conversation
              </h3>
              <p className="text-[11px] text-mute truncate">
                Select a channel provider and recipient to start chatting
              </p>
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

        {/* Channel Provider Selector */}
        <div className="border-b border-hairline bg-surface-well/50 p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-mute mb-1.5 px-1 font-semibold">
            Select Provider / Platform
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableChannels.map((ch) => {
              const meta = channelMeta(ch);
              const isSelected = selectedChannel === ch;
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    setSelectedChannel(ch);
                    setQuery("");
                    setTargetId("");
                    setTargetName("");
                    setManualError(null);
                  }}
                  className={`flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? "border-ink bg-canvas-elevated text-ink shadow-2xs font-semibold ring-1 ring-ink/20"
                      : "border-hairline bg-canvas/60 text-mute hover:bg-canvas hover:text-ink"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] text-white font-bold shrink-0 ${meta.tile}`}
                  >
                    {ch === "slack" ? "#" : ch === "whatsapp" ? "W" : ch === "telegram" ? "T" : ch === "discord" ? "D" : ch[0].toUpperCase()}
                  </span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Provider Content Area */}
        {selectedChannel === "slack" ? (
          <div className="flex flex-1 flex-col min-h-0 bg-canvas">
            {/* Slack Workspace Header & Subtabs */}
            <div className="border-b border-hairline px-3 pt-2.5 pb-2 bg-canvas">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#E01E5A]/10 dark:text-[#E01E5A]">
                    Slack Workspace
                  </span>
                  {slackAccount?.name && (
                    <span className="font-mono text-[11px] text-mute truncate max-w-[200px]">
                      {slackAccount.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative flex items-center mb-2">
                <svg
                  className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-mute"
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
                    slackTab === "users"
                      ? "Search Slack members by name or @handle…"
                      : "Search Slack channels by #name…"
                  }
                  className="h-8 w-full rounded-[6px] border border-hairline bg-canvas-elevated pl-8 pr-3 text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
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

              {/* Slack Subtabs (Users vs Channels) */}
              <div className="flex gap-1 border-t border-hairline/60 pt-2 text-[12px] font-medium">
                <button
                  type="button"
                  onClick={() => setSlackTab("users")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer ${
                    slackTab === "users"
                      ? "bg-surface-well font-semibold text-ink"
                      : "text-mute hover:text-ink"
                  }`}
                >
                  <span>👥 Direct Messages</span>
                  {directory?.users && (
                    <span className="font-mono text-[10px] rounded-full bg-canvas-elevated px-1.5 py-0.2 text-mute border border-hairline">
                      {directory.users.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSlackTab("channels")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer ${
                    slackTab === "channels"
                      ? "bg-surface-well font-semibold text-ink"
                      : "text-mute hover:text-ink"
                  }`}
                >
                  <span>#️⃣ Channels</span>
                  {directory?.channels && (
                    <span className="font-mono text-[10px] rounded-full bg-canvas-elevated px-1.5 py-0.2 text-mute border border-hairline">
                      {directory.channels.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Slack List Content */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-canvas">
              {isSlackLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-mute gap-2">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-mute/30 border-t-ink" />
                  <p className="text-[12.5px]">Fetching Slack workspace members…</p>
                </div>
              ) : isSlackError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-error px-4 gap-1.5">
                  <p className="text-[13px] font-semibold">Could not load Slack directory</p>
                  <p className="text-[12px] text-mute max-w-sm">
                    {slackError instanceof Error
                      ? slackError.message
                      : "Ensure your Slack bot is connected in Settings."}
                  </p>
                </div>
              ) : slackTab === "users" ? (
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
                            onClick={() => handleSelectSlackUser(user)}
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
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4A154B] text-[8px] font-bold text-white ring-1 ring-canvas">
                                #
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-ink truncate group-hover:underline">
                                  {user.displayName}
                                </span>
                                <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#E01E5A]/10 dark:text-[#E01E5A] font-semibold">
                                  Slack DM
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
                              {isBusy ? "Opening…" : "Start Chat →"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : filteredChannels.length === 0 ? (
                <div className="py-12 px-6 text-center text-[12.5px] flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">#️⃣</span>
                  <p className="font-medium text-ink">
                    {query ? `No channels match “#${query}”` : "No channels found"}
                  </p>
                  {directory?.scopeWarning ? (
                    <div className="mt-2 rounded-[8px] border border-amber-500/20 bg-amber-500/10 p-3 text-left font-mono text-[11px] text-amber-600 dark:text-amber-400 max-w-md">
                      ⚠️ {directory.scopeWarning}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-mute max-w-sm">
                      To see your workspace channels here, invite the bot (e.g. type <code className="font-mono bg-surface-well px-1 py-0.5 rounded text-ink">/invite @ConnectMe</code> in Slack) or enable the <code className="font-mono bg-surface-well px-1 py-0.5 rounded text-ink">channels:read</code> scope at <span className="underline">api.slack.com</span>.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredChannels.map((channel) => {
                    const isBusy = creatingId === channel.id;
                    return (
                      <li key={channel.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSlackChannel(channel)}
                          disabled={isBusy}
                          className="flex w-full items-center gap-3 rounded-[8px] p-2 text-left transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer group"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#4A154B]/10 font-mono font-bold text-[#4A154B] dark:text-[#E01E5A] text-[13px] border border-[#4A154B]/20">
                            {channel.isPrivate ? "🔒" : "#"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium text-ink truncate group-hover:underline">
                                #{channel.name}
                              </span>
                              <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#E01E5A]/10 dark:text-[#E01E5A] font-semibold">
                                Slack Channel
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
          </div>
        ) : (
          /* Manual Input for Other Providers (WhatsApp, Telegram, Discord, Messenger, Instagram) */
          <div className="flex-1 p-5 bg-canvas overflow-y-auto">
            <form onSubmit={handleManualSubmit} className="space-y-4 max-w-md mx-auto py-4">
              <div className="flex items-center gap-2 pb-2 border-b border-hairline">
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white text-[11px] font-bold ${channelMeta(selectedChannel).tile}`}
                >
                  {selectedChannel[0].toUpperCase()}
                </span>
                <div>
                  <h4 className="text-[13.5px] font-semibold text-ink">
                    Start {channelMeta(selectedChannel).label} Conversation
                  </h4>
                  <p className="text-[11.5px] text-mute">
                    Enter the recipient's identifier to initiate a thread
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-body mb-1">
                  {selectedChannel === "whatsapp"
                    ? "Recipient Phone Number (with country code)"
                    : selectedChannel === "telegram"
                    ? "Telegram Username (@username) or Chat ID"
                    : selectedChannel === "discord"
                    ? "Discord User ID or Channel ID"
                    : "Recipient ID / Handle"}
                </label>
                <input
                  type="text"
                  required
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder={
                    selectedChannel === "whatsapp"
                      ? "+1 555 123 4567"
                      : selectedChannel === "telegram"
                      ? "@username or 12345678"
                      : "1234567890"
                  }
                  className="h-9 w-full rounded-[8px] border border-hairline bg-canvas-elevated px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-body mb-1">
                  Contact Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-9 w-full rounded-[8px] border border-hairline bg-canvas-elevated px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                />
              </div>

              {manualError && (
                <div className="rounded-[6px] border border-error/30 bg-error/10 p-2 font-mono text-[11.5px] text-error">
                  {manualError}
                </div>
              )}

              <button
                type="submit"
                disabled={Boolean(creatingId)}
                className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-primary py-2.5 text-[13px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {creatingId ? (
                  <span>Opening conversation…</span>
                ) : (
                  <span>Start {channelMeta(selectedChannel).label} Conversation →</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="border-t border-hairline bg-surface-well/50 px-4 py-2 flex items-center justify-between text-[11px] text-mute">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${channelMeta(selectedChannel).dot}`}
            />
            <span className="font-medium text-body">
              Active Provider: {channelMeta(selectedChannel).label}
            </span>
          </div>
          <span className="font-mono text-[10px]">Esc to close</span>
        </div>
      </div>
    </div>
  );
}
