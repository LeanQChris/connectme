"use client";

import { memo } from "react";
import { useConversationSearch } from "../hooks/use-conversation-search";
import { ConversationItem } from "./conversation-item";
import type { ConversationSummary } from "@/core/types";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

const ConversationList = memo(function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationListProps) {
  const { search, setSearch, query, searching, rows, isFetching } =
    useConversationSearch(conversations);

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
            className="h-8 w-full rounded-[6px] border border-hairline bg-canvas-elevated pl-8 pr-3 text-[14px] sm:text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
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
          rows.map((row) => (
            <ConversationItem
              key={`${row.conversation.id}-${row.createdAt}`}
              row={row}
              selected={row.conversation.id === selectedId}
              searching={searching}
              onSelect={onSelect}
            />
          ))
        )}
      </ul>
    </div>
  );
});

export default ConversationList;
