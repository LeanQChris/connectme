"use client";

import type { ConversationSummary } from "@/lib/types";

import { ChannelDot, channelMeta } from "./channel-badge";
import { formatRelative } from "./format";

interface Props {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export default function ConversationList({ conversations, selectedId, onSelect, loading }: Props) {
  if (!loading && conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-[13px] font-medium text-ink">No conversations yet</p>
        <p className="max-w-[26ch] text-[13px] leading-relaxed text-ink-secondary">
          Nothing has arrived from WhatsApp or Messenger. Threads show up the moment Meta delivers
          to <span className="font-mono text-[12px] text-ink">/api/webhook</span>.
        </p>
        <p className="max-w-[30ch] text-[12px] leading-relaxed text-ink-muted">
          Still empty? Check the dev server log for{" "}
          <span className="font-mono text-[11px]">webhook</span> lines to see whether Meta ever
          delivered anything.
        </p>
      </div>
    );
  }

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const selected = conversation.id === selectedId;
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={selected}
              className={`flex w-full items-start gap-2.5 border-l-2 px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-l-ink bg-surface"
                  : "border-l-transparent hover:bg-surface"
              }`}
            >
              <ChannelDot channel={conversation.channel} className="mt-1.5" />

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span
                    className={`truncate text-[13px] ${
                      selected ? "font-medium text-ink" : "text-ink"
                    }`}
                  >
                    {conversation.contactName}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">
                    {formatRelative(conversation.lastMessageAt)}
                  </span>
                </span>

                <span className="mt-0.5 flex items-baseline justify-between gap-3">
                  <span
                    className={`truncate text-[13px] ${
                      conversation.unreadCount > 0 ? "text-ink" : "text-ink-secondary"
                    }`}
                  >
                    {conversation.lastMessage ?? "—"}
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-ink px-1.5 font-mono text-[10px] font-medium tabular-nums text-bg">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
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
    { value: "whatsapp", label: channelMeta("whatsapp").label },
    { value: "messenger", label: channelMeta("messenger").label },
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
            className={`rounded-md px-2 py-1 text-xs transition-colors ${
              active
                ? "bg-ink text-bg"
                : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {option.label}
            {option.value && counts[option.value] ? (
              <span className="ml-1 font-mono tabular-nums opacity-60">{counts[option.value]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}