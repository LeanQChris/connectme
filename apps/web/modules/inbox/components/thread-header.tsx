"use client";

import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { channelMeta } from "@/components/ui/channel-badge";
import { AssigneePicker } from "./assignee-picker";
import { TagPicker } from "./tag-picker";
import type { ConversationSummary } from "@/core/types";
import type { ConversationMetaPatch } from "../api/inbox.api";

interface ThreadHeaderProps {
  conversation: ConversationSummary;
  channelInfo: ReturnType<typeof channelMeta>;
  archived: boolean;
  copied: boolean;
  firstResponse: number | null;
  onCopyId: () => void;
  onBack: () => void;
  onArchive: () => void;
  onDelete?: () => void;
  onMeta: (patch: ConversationMetaPatch) => void;
}

const SLA_TARGET_MS = 15 * 60 * 1000;

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  const hours = ms / 3_600_000;
  return hours < 24 ? `${hours.toFixed(1)}h` : `${Math.round(hours / 24)}d`;
}

export function ThreadHeader({
  conversation,
  channelInfo,
  archived,
  copied,
  firstResponse,
  onCopyId,
  onBack,
  onArchive,
  onDelete,
  onMeta,
}: ThreadHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-canvas-elevated px-2.5 sm:px-4 gap-1.5 sm:gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-body transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well md:hidden cursor-pointer"
        >
          <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Avatar
          name={conversation.contactName}
          avatarUrl={conversation.avatarUrl}
          channel={conversation.channel}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="truncate text-[13px] sm:text-[14px] font-semibold tracking-[-0.02em] text-ink">
              {conversation.contactName}
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.2 font-mono text-[9.5px] sm:text-[10px] font-medium tracking-wide uppercase shrink-0 ${channelInfo.soft}`}
            >
              {channelInfo.label}
            </span>
            {conversation.accountName && (
              <span
                title={`Received on ${conversation.accountName} · ${channelInfo.label}`}
                className={`hidden xs:inline-flex max-w-[80px] sm:max-w-[160px] items-center truncate rounded-[4px] px-1.5 sm:px-2 py-0.2 font-mono text-[9.5px] sm:text-[10px] font-medium ${channelInfo.soft}`}
              >
                {conversation.accountName}
              </span>
            )}
            {archived && (
              <span className="inline-flex items-center rounded-full bg-surface-well px-1.5 sm:px-2 py-0.2 font-mono text-[9.5px] sm:text-[10px] font-medium tracking-wide uppercase text-mute shrink-0">
                Archived
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-mute">
            <span className="truncate font-mono">{conversation.contactExternalId}</span>
            <button
              type="button"
              onClick={onCopyId}
              title="Copy ID"
              className="rounded p-0.5 text-mute hover:bg-surface-well hover:text-ink transition-colors shrink-0 cursor-pointer"
            >
              {copied ? (
                <span className="font-mono text-[10px] text-emerald-500 font-medium">Copied!</span>
              ) : (
                <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {firstResponse !== null && (
          <span
            className={`hidden items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums lg:flex ${
              firstResponse <= SLA_TARGET_MS
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-warning/30 bg-warning/10 text-warning"
            }`}
            title={`First reply ${formatDuration(firstResponse)} after the first inbound message`}
          >
            <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            First reply {formatDuration(firstResponse)}
          </span>
        )}

        <AssigneePicker
          value={conversation.assignee}
          onChange={(assignee) => onMeta({ assignee })}
        />

        <TagPicker tags={conversation.tags} onChange={(tags) => onMeta({ tags })} />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onArchive}
          title={archived ? "Restore to inbox" : "Archive conversation"}
          className="h-8 px-2 sm:px-2.5 text-[12px]"
        >
          <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M3 3h18v5H3zM10 12h4"
            />
          </svg>
          <span className="hidden sm:inline">{archived ? "Restore" : "Archive"}</span>
        </Button>

        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Delete conversation"
            className="h-8 w-8 p-0 text-mute hover:text-error hover:bg-error/10 transition-colors"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        )}
      </div>
    </header>
  );
}
