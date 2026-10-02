"use client";

import { memo } from "react";
import Avatar from "@/components/ui/avatar";
import { channelMeta } from "@/components/ui/channel-badge";
import { formatRelative } from "@/core/utils/format";
import type { ConversationRow } from "../hooks/use-conversation-search";

interface ConversationItemProps {
  row: ConversationRow;
  selected: boolean;
  searching: boolean;
  onSelect: (id: string) => void;
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

export const ConversationItem = memo(function ConversationItem({
  row,
  selected,
  searching,
  onSelect,
}: ConversationItemProps) {
  const conversation = row.conversation;
  const hasRealName = conversation.contactName !== conversation.contactExternalId;
  const unread = conversation.unreadCount > 0;
  const channelInfo = channelMeta(conversation.channel);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-current={selected}
        className={`group relative flex w-full items-center gap-3 px-3 py-2.5 sm:px-3.5 sm:py-3 text-left transition-colors active:bg-surface-well cursor-pointer ${
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
            <div className="flex min-w-0 items-center gap-1.5">
              {conversation.accountName && (
                <span
                  title={`${channelInfo.label} · ${conversation.accountName}`}
                  className={`max-w-[92px] shrink-0 truncate rounded-[4px] px-1.5 py-px font-mono text-[9.5px] font-medium ${channelInfo.soft}`}
                >
                  {conversation.accountName}
                </span>
              )}
              <span
                className={`truncate text-[13px] tracking-[-0.01em] ${
                  selected || unread ? "font-semibold text-ink" : "font-medium text-ink"
                }`}
              >
                {conversation.contactName}
              </span>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-mute">
              {formatRelative(row.createdAt)}
            </span>
          </div>

          {(hasRealName || conversation.assignee) && (
            <div className="flex items-center gap-1.5 flex-wrap">
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
});
