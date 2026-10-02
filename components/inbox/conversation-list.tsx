"use client";

import { useState } from "react";
import { useMessageSearch } from "@/lib/hooks/use-inbox";
import type { ConversationSummary } from "@/lib/types";

import Avatar from "./avatar";
import { formatRelative } from "./format";

interface Props {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

interface Row {
  conversation: ConversationSummary;
  snippet: string;
  createdAt: string;
}

function previewLabel(message: string | null | undefined): string {
  if (!message) return "—";
  if (message === "[attachment]" || message === "[image]") return "📷 Image";
  if (message === "[video]") return "🎥 Video";
  if (message === "[audio]") return "🎵 Audio";
  if (message === "[document]") return "📄 Document";
  if (message === "[message]") return "💬 Message";
  return message;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: Props) {
  const [search, setSearch] = useState("");
  const query = search.trim();
  const searching = query.length >= 2;
  const { data: hits = [], isFetching } = useMessageSearch(query);

  // Two chars or more go to the server so message bodies are searchable too.
  const rows: Row[] = searching
    ? hits.map((hit) => ({
        conversation: hit.conversation,
        snippet: hit.snippet,
        createdAt: hit.createdAt,
      }))
    : conversations
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
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="border-b border-hairline p-2.5">
        <div className="relative flex items-center">
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
            className="h-8 w-full rounded-[6px] border border-hairline bg-canvas-elevated pl-8 pr-3 text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
          />
          {searching && isFetching && (
            <span className="absolute right-2.5 font-mono text-[10px] text-mute">…</span>
          )}
        </div>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
        {rows.length === 0 ? (
          <li className="p-6 text-center text-[12px] text-mute">
            {searching ? `No messages match “${query}”` : "No conversations here"}
          </li>
        ) : (
          rows.map((row) => {
            const conversation = row.conversation;
            const selected = conversation.id === selectedId;
            const hasRealName = conversation.contactName !== conversation.contactExternalId;
            const unread = conversation.unreadCount > 0;

            return (
              <li key={`${conversation.id}-${row.createdAt}`}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={selected}
                  className={`group relative flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                    selected
                      ? "bg-canvas-elevated shadow-[inset_2px_0_0_var(--ink)]"
                      : "hover:bg-surface-well"
                  }`}
                >
                  <Avatar
                    name={conversation.contactName}
                    avatarUrl={conversation.avatarUrl}
                    channel={conversation.channel}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[13px] tracking-[-0.01em] ${
                          selected || unread ? "font-semibold text-ink" : "font-medium text-ink"
                        }`}
                      >
                        {conversation.contactName}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-mute">
                        {formatRelative(row.createdAt)}
                      </span>
                    </div>

                    {(hasRealName || conversation.assignee) && (
                      <div className="flex items-center gap-1.5">
                        {hasRealName && (
                          <p className="truncate font-mono text-[10px] text-mute">
                            {conversation.contactExternalId}
                          </p>
                        )}
                        {conversation.assignee && (
                          <span
                            title={`Assigned to ${conversation.assignee}`}
                            className="shrink-0 rounded-full bg-surface-well px-1.5 py-px font-mono text-[9.5px] text-mute"
                          >
                            {conversation.assignee}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[12px] leading-snug ${
                          unread ? "font-medium text-ink" : "text-body"
                        }`}
                      >
                        {searching ? row.snippet : previewLabel(row.snippet)}
                      </span>
                      {unread && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-on-primary">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>

                    {conversation.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {conversation.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-hairline px-1.5 py-px font-mono text-[9.5px] text-mute"
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
