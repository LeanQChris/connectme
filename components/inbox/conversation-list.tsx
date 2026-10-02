"use client";

import { useState } from "react";
import type { ConversationSummary } from "@/lib/types";

import Avatar from "./avatar";
import { formatRelative } from "./format";

interface Props {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.contactExternalId.toLowerCase().includes(q) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  if (!loading && conversations.length === 0) {
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
          Incoming messages from WhatsApp &amp; Messenger will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      {conversations.length > 0 && (
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
              placeholder="Search conversations…"
              className="h-8 w-full rounded-[6px] border border-hairline bg-canvas-elevated pl-8 pr-3 text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      <ul className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="p-6 text-center text-[12px] text-mute">
            No matches found for &ldquo;{search}&rdquo;
          </li>
        ) : (
          filtered.map((conversation) => {
            const selected = conversation.id === selectedId;
            const hasRealName = conversation.contactName !== conversation.contactExternalId;

            return (
              <li key={conversation.id}>
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
                          selected
                            ? "font-semibold text-ink"
                            : conversation.unreadCount > 0
                              ? "font-semibold text-ink"
                              : "font-medium text-ink"
                        }`}
                      >
                        {conversation.contactName}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-mute">
                        {formatRelative(conversation.lastMessageAt)}
                      </span>
                    </div>

                    {hasRealName && (
                      <p className="truncate font-mono text-[10px] text-mute">
                        {conversation.contactExternalId}
                      </p>
                    )}

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[12px] leading-snug ${
                          conversation.unreadCount > 0
                            ? "font-medium text-ink"
                            : "text-body"
                        }`}
                      >
                        {(() => {
                          const msg = conversation.lastMessage;
                          if (!msg) return "—";
                          if (msg === "[attachment]" || msg === "[image]") return "📷 Image";
                          if (msg === "[video]") return "🎥 Video";
                          if (msg === "[audio]") return "🎵 Audio";
                          if (msg === "[document]") return "📄 Document";
                          if (msg === "[message]") return "💬 Message";
                          return msg;
                        })()}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-on-primary">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
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
