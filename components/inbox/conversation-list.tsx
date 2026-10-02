"use client";

import { useState } from "react";
import type { ConversationSummary } from "@/lib/types";

import Avatar from "./avatar";
import { channelMeta } from "./channel-badge";
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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted ring-1 ring-hairline">
          <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-[14px] font-semibold text-ink">No conversations yet</p>
        <p className="max-w-[26ch] text-[12px] leading-relaxed text-ink-secondary">
          Waiting for messages from WhatsApp or Messenger.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {conversations.length > 0 && (
        <div className="border-b border-hairline px-3 py-2">
          <div className="relative flex items-center">
            <svg
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-muted"
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
              placeholder="Search conversations..."
              className="h-8 w-full rounded-lg border border-hairline bg-surface-2 pl-8 pr-3 text-[12px] text-ink placeholder:text-ink-muted focus:border-accent focus:bg-bg focus:outline-none transition-all"
            />
          </div>
        </div>
      )}

      <ul className="min-h-0 flex-1 divide-y divide-hairline/60 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="p-6 text-center text-[12px] text-ink-muted">
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
                  className={`group relative flex w-full items-center gap-3 px-3.5 py-3 text-left transition-all ${
                    selected
                      ? "bg-surface-2 shadow-xs"
                      : "hover:bg-surface/80"
                  }`}
                >
                  {selected && (
                    <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-accent" />
                  )}

                  <Avatar
                    name={conversation.contactName}
                    avatarUrl={conversation.avatarUrl}
                    channel={conversation.channel}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[13px] tracking-tight ${
                          selected
                            ? "font-semibold text-ink"
                            : conversation.unreadCount > 0
                              ? "font-bold text-ink"
                              : "font-medium text-ink"
                        }`}
                      >
                        {conversation.contactName}
                      </span>
                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-ink-muted">
                        {formatRelative(conversation.lastMessageAt)}
                      </span>
                    </div>

                    {hasRealName && (
                      <p className="truncate font-mono text-[10.5px] text-ink-muted opacity-80">
                        {conversation.contactExternalId}
                      </p>
                    )}

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[12px] leading-snug ${
                          conversation.unreadCount > 0
                            ? "font-medium text-ink"
                            : "text-ink-secondary"
                        }`}
                      >
                        {(() => {
                          const msg = conversation.lastMessage;
                          if (!msg) return "—";
                          if (msg === "[attachment]" || msg === "[image]") return "📷 Photo";
                          if (msg === "[video]") return "🎥 Video";
                          if (msg === "[audio]") return "🎵 Voice message";
                          if (msg === "[document]") return "📄 Document";
                          return msg;
                        })()}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-bold text-white shadow-xs">
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

export function ConversationFilter({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
}) {
  const options = [
    { value: "", label: "All" },
    { value: "messenger", label: channelMeta("messenger").label },
    { value: "whatsapp", label: channelMeta("whatsapp").label },
  ];

  return (
    <div className="flex items-center gap-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value || "all"}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all ${
              active
                ? "bg-ink text-bg shadow-xs"
                : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span>{option.label}</span>
            {counts[option.value] !== undefined ? (
              <span
                className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] tabular-nums ${
                  active ? "bg-bg/20 text-bg" : "bg-surface-2 text-ink-muted"
                }`}
              >
                {counts[option.value]}
              </span>
            ) : option.value === "" && counts.total ? (
              <span
                className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] tabular-nums ${
                  active ? "bg-bg/20 text-bg" : "bg-surface-2 text-ink-muted"
                }`}
              >
                {counts.total}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}