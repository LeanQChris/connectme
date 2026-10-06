"use client";

import { useState } from "react";
import { useMessageSearch } from "@/lib/hooks/use-inbox";
import type { ConversationSummary } from "@/lib/types";

import Avatar from "./avatar";
import { channelMeta } from "./channel-badge";
import { formatRelative } from "./format";

interface Props {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  onNewConversation?: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

interface Row {
  conversation: ConversationSummary;
  snippet: string;
  createdAt: string;
}

/** Slack mrkdwn / mention tokens → readable plain text for previews. */
function slackify(text: string): string {
  return text
    .replace(/<@([A-Z0-9]+)\|([^|>]+)(?:\|[^>]+)?>/g, "@$2")
    .replace(/<@([A-Z0-9]+)>/g, "@user")
    .replace(/<#([A-Z0-9]+)\|([^>]+)>/g, "#$2")
    .replace(/<#([A-Z0-9]+)>/g, "#channel")
    .replace(/<!(here|channel|everyone)>/g, "@$1")
    .replace(/<!([a-z]+)\^[^|>]+\|([^>]+)>/g, "@$2")
    .replace(/<!([a-z]+)\^[^>]+>/g, "@$1")
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(mailto:[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(tel:[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:\/\/[^>]+|mailto:[^>]+|tel:[^>]+)>/g, "$1");
}

function previewLabel(message: string | null | undefined): string {
  if (!message) return "—";
  if (message === "[attachment]" || message === "[image]") return "📷 Image";
  if (message === "[video]") return "🎥 Video";
  if (message === "[audio]") return "🎵 Audio";
  if (message === "[document]") return "📄 Document";
  if (message === "[message]") return "💬 Message";
  return slackify(message);
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  onNewConversation,
  selectedIds,
  onToggleSelect,
}: Props) {
  const [search, setSearch] = useState("");
  const [showSnoozed, setShowSnoozed] = useState(false);
  const query = search.trim();
  const searching = query.length >= 2;
  const { data: hits = [], isFetching } = useMessageSearch(query);

  const now = Date.now();
  const isSnoozed = (c: ConversationSummary) =>
    Boolean(c.snoozedUntil && new Date(c.snoozedUntil).getTime() > now);
  const snoozedCount = conversations.filter(isSnoozed).length;

  // Two chars or more go to the server so message bodies are searchable too.
  const rows: Row[] = searching
    ? hits.map((hit) => ({
        conversation: hit.conversation,
        snippet: hit.snippet,
        createdAt: hit.createdAt,
      }))
    : conversations
        .filter((c) => (showSnoozed ? isSnoozed(c) : !isSnoozed(c)))
        .filter((c) => {
          if (!query) return true;
          const q = query.toLowerCase();
          return (
            c.contactName.toLowerCase().includes(q) ||
            c.contactExternalId.toLowerCase().includes(q) ||
            (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
          );
        })
        .map((c) => ({ conversation: c, snippet: c.lastMessage ?? "", createdAt: c.lastMessageAt }));

  if (!loading && conversations.length === 0 && !searching) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-hairline bg-canvas-elevated text-mute shadow-2xs">
          <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-ink">No conversations</p>
        <p className="max-w-[24ch] text-[12px] leading-relaxed text-body">
          Incoming messages from WhatsApp, Messenger, Instagram &amp; Telegram will appear here.
        </p>
        {onNewConversation && (
          <button
            type="button"
            onClick={onNewConversation}
            className="mt-2 flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-medium text-on-primary transition-opacity hover:opacity-90 active:scale-95 cursor-pointer shadow-2xs"
          >
            <span>+</span>
            <span>New Conversation</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="flex items-center gap-1.5 border-b border-hairline p-2.5">
        <div className="relative flex flex-1 items-center">
          <svg
            className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-mute"
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search names and messages…"
            className="h-8 w-full rounded-[6px] border border-hairline bg-canvas-elevated pl-8 pr-3 text-[14px] sm:text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
          />
          {searching && isFetching && (
            <span className="absolute right-2.5 font-mono text-[10px] text-mute">…</span>
          )}
        </div>

        {onNewConversation && (
          <button
            type="button"
            onClick={onNewConversation}
            title="Start new conversation (Slack)"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas-elevated text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}
      </div>

      {snoozedCount > 0 && (
        <div className="flex items-center gap-1.5 border-b border-hairline px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => setShowSnoozed((v) => !v)}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] transition-colors ${
              showSnoozed
                ? "border-ink bg-ink text-on-primary"
                : "border-hairline bg-canvas-elevated text-mute hover:text-ink"
            }`}
          >
            💤 Snoozed ({snoozedCount})
          </button>
          {showSnoozed && (
            <span className="font-mono text-[10px] text-mute">showing snoozed only</span>
          )}
        </div>
      )}

      <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
        {rows.length === 0 ? (
          <li className="p-8 text-center text-[12.5px] text-mute flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">💬</span>
            <p>{searching ? `No messages match “${query}”` : "No conversations found"}</p>
          </li>
        ) : (
          rows.map((row) => {
            const conversation = row.conversation;
            const selected = conversation.id === selectedId;
            const isChannel =
              conversation.contactName.startsWith("#") ||
              (conversation.channel === "slack" &&
                (conversation.contactExternalId.startsWith("C") ||
                  conversation.contactExternalId.startsWith("G")));
            const displayName = isChannel
              ? conversation.contactName.startsWith("#")
                ? conversation.contactName
                : `#${conversation.contactName || conversation.contactExternalId}`
              : conversation.contactName;
            const hasRealName =
              !isChannel && conversation.contactName !== conversation.contactExternalId;
            const unread = conversation.unreadCount > 0;
            const channelInfo = channelMeta(conversation.channel);

            return (
              <li key={`${conversation.id}-${row.createdAt}`}>
                    <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={selected}
                  className={`group relative flex w-full items-start gap-3 rounded-[8px] p-2.5 text-left transition-all cursor-pointer ${
                    selected
                      ? "bg-canvas-elevated shadow-2xs ring-1 ring-hairline border-l-[3px] border-l-ink"
                      : "hover:bg-surface-well/70 border-l-[3px] border-l-transparent"
                  }`}
                >
                  {onToggleSelect && (
                    <span
                      role="checkbox"
                      aria-checked={selectedIds?.has(conversation.id) ?? false}
                      aria-label="Select conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(conversation.id);
                      }}
                      className={`mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border border-hairline bg-canvas-elevated transition-opacity ${
                        selectedIds?.has(conversation.id)
                          ? "opacity-100 bg-ink border-ink text-on-primary"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {selectedIds?.has(conversation.id) && (
                        <svg className="h-2.5 w-2.5 stroke-current" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  )}
                  <Avatar
                    name={displayName}
                    avatarUrl={conversation.avatarUrl}
                    channel={conversation.channel}
                    size="md"
                    isChannel={isChannel}
                  />

                  <div className="min-w-0 flex-1">
                    {/* Header: Name + Badge + Timestamp */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5 flex-1">
                        <span
                          className={`truncate text-[13px] tracking-[-0.01em] ${
                            isChannel
                              ? "font-semibold font-mono text-ink"
                              : selected || unread
                              ? "font-semibold text-ink"
                              : "font-medium text-ink"
                          }`}
                        >
                          {displayName}
                        </span>

                        {isChannel ? (
                          <span
                            className="shrink-0 rounded-[4px] bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#E01E5A]/10 dark:text-[#E01E5A] px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase tracking-wider"
                          >
                            Channel
                          </span>
                        ) : conversation.accountName ? (
                          <span
                            title={`${channelInfo.label} · ${conversation.accountName}`}
                            className={`shrink-0 max-w-[85px] truncate rounded-[4px] px-1.5 py-0.2 font-mono text-[9px] font-medium ${channelInfo.soft}`}
                          >
                            {conversation.accountName}
                          </span>
                        ) : null}
                      </div>

                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-mute">
                        {isSnoozed(conversation) && (
                          <span className="mr-1" title={`Snoozed until ${conversation.snoozedUntil}`}>
                            💤 {formatRelative(conversation.snoozedUntil!)}
                          </span>
                        )}
                        {formatRelative(row.createdAt)}
                      </span>
                    </div>

                    {/* Subtitle: Handle/ID for Direct Messages */}
                    {(!isChannel && hasRealName) || conversation.assignee ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {!isChannel && hasRealName && (
                          <span className="truncate font-mono text-[10.5px] text-mute">
                            {conversation.contactExternalId}
                          </span>
                        )}
                        {conversation.assignee && (
                          <span
                            title={`Assigned to ${conversation.assignee}`}
                            className="shrink-0 rounded-full bg-surface-well px-1.5 py-px font-mono text-[9px] text-mute border border-hairline"
                          >
                            {conversation.assignee}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {/* Preview Snippet + Unread Pill */}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[12px] leading-snug flex-1 ${
                          unread ? "font-medium text-ink" : "text-mute group-hover:text-body"
                        }`}
                      >
                        {previewLabel(row.snippet)}
                      </span>

                      {unread && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold text-on-primary shadow-2xs animate-pulse">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {conversation.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {conversation.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-[4px] border border-hairline bg-surface-well px-1.5 py-0.2 font-mono text-[9px] text-mute"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
