"use client";

import { Fragment, memo } from "react";
import Avatar from "@/components/ui/avatar";
import { formatTime } from "@/core/utils/format";
import type { ConversationSummary, Message, MessageStatus } from "@/core/types";
import { MessageAttachment } from "./message-attachment";

interface MessageItemProps {
  message: Message;
  prevMessage?: Message;
  nextMessage?: Message;
  conversation: ConversationSummary;
  unreadBoundary: string | null;
  unreadCount: number;
  copiedMessageId: string | null;
  onCopyMessage: (id: string, text: string) => void;
  onOpenImage: (url: string) => void;
}

const STATUS_GLYPH: Record<MessageStatus, { text: string; color: string }> = {
  received: { text: "", color: "" },
  sent: { text: "✓", color: "opacity-60" },
  delivered: { text: "✓✓", color: "opacity-60" },
  read: { text: "✓✓", color: "text-link font-medium" },
  failed: { text: "!", color: "text-error font-medium" },
};

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function isOnlyEmoji(str: string | null | undefined): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed || trimmed.length > 8) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)+$/u;
  return emojiRegex.test(trimmed);
}

export const MessageItem = memo(function MessageItem({
  message,
  prevMessage,
  nextMessage,
  conversation,
  unreadBoundary,
  unreadCount,
  copiedMessageId,
  onCopyMessage,
  onOpenImage,
}: MessageItemProps) {
  const isNote = message.direction === "note";
  const outgoing = message.direction === "out";
  const status = STATUS_GLYPH[message.status];
  const day = formatDateDivider(message.createdAt);
  const showDivider = !prevMessage || formatDateDivider(prevMessage.createdAt) !== day;
  const runStart = showDivider || !prevMessage || prevMessage.direction !== message.direction;
  const showAvatar =
    !outgoing && !isNote && (!nextMessage || nextMessage.direction !== message.direction);
  const hasMedia = Boolean(message.mediaUrl);
  const onlyEmoji = isOnlyEmoji(message.text) && !hasMedia;
  const caption =
    message.text && (message.type === "image" || message.type === "video" || !hasMedia);

  if (isNote) {
    return (
      <div
        className={`flex items-stretch gap-2.5 sm:gap-3 ${
          runStart ? "mt-4" : "mt-1.5"
        }`}
      >
        <span aria-hidden className="w-0.5 shrink-0 self-stretch rounded-full bg-warning/45" />
        <div className="group min-w-0 flex-1 border-y border-dashed border-warning/25 py-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] text-warning">
              Internal note
            </span>
            {message.author && (
              <span className="truncate font-mono text-[10px] text-body">{message.author}</span>
            )}
            <span
              aria-hidden
              className="h-px flex-1 bg-hairline opacity-0 transition-opacity group-hover:opacity-100"
            />
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-mute opacity-70 transition-opacity group-hover:opacity-100">
              {formatTime(message.createdAt)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-body select-text">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      {showDivider && (
        <div className="my-5 flex items-center justify-center first:mt-0">
          <span className="rounded-full border border-hairline bg-canvas-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mute shadow-2xs">
            {day}
          </span>
        </div>
      )}

      {message.id === unreadBoundary && unreadCount > 0 && (
        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-link/30" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-link">
            {unreadCount} new
          </span>
          <span className="h-px flex-1 bg-link/30" />
        </div>
      )}

      <div
        className={`flex items-end gap-2 ${outgoing ? "justify-end" : "justify-start"} ${
          runStart ? "mt-4" : "mt-1"
        }`}
      >
        {!outgoing && (
          <div className="w-8 shrink-0 self-end">
            {showAvatar && (
              <Avatar
                name={conversation.contactName}
                avatarUrl={conversation.avatarUrl}
                channel={conversation.channel}
                size="sm"
                showChannelBadge={false}
                className="shadow-2xs"
              />
            )}
          </div>
        )}

        <div
          className={`group relative max-w-[78%] leading-[1.55] sm:max-w-[68%] ${
            onlyEmoji
              ? "p-1 bg-transparent !ring-0"
              : hasMedia
                ? "w-fit p-1.5"
                : "px-3 py-2 text-[13px]"
          } ${
            onlyEmoji
              ? ""
              : outgoing
                ? "rounded-[14px] rounded-br-[4px] bg-primary text-on-primary"
                : "rounded-[14px] rounded-bl-[4px] bg-canvas-elevated text-ink ring-1 ring-hairline ring-inset"
          }`}
        >
          {message.type !== "text" && (
            <MessageAttachment message={message} onOpenImage={onOpenImage} />
          )}

          {onlyEmoji ? (
            <div className="text-3xl leading-tight select-text py-0.5">{message.text}</div>
          ) : (
            caption &&
            message.text &&
            !message.text.startsWith("[") &&
            message.type === "text" && (
              <p
                className={`whitespace-pre-wrap break-words select-text ${
                  hasMedia ? "px-1.5 pt-1.5" : ""
                }`}
              >
                {message.text}
              </p>
            )
          )}

          {message.type !== "text" &&
            message.text &&
            !message.text.startsWith("[") &&
            message.text !== "Video message" &&
            message.text !== "Attached Document" &&
            message.text !== "Photo Attachment" && (
              <p className="whitespace-pre-wrap break-words select-text px-1.5 pt-1.5 text-[12.5px]">
                {message.text}
              </p>
            )}

          {message.error ? (
            <div className="mt-1.5 rounded-[6px] border border-error/30 bg-error/10 px-2 py-1.5 font-mono text-[11px] leading-snug text-error">
              <span className="block font-bold">{message.error}</span>
            </div>
          ) : null}

          {/* Metadata: quiet until hover, ticks only on outgoing. */}
          <div
            className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] tabular-nums select-none ${
              outgoing ? "opacity-60" : "text-mute opacity-70"
            } group-hover:opacity-100 ${hasMedia ? "-mb-0.5 pr-1" : ""}`}
            title={`${formatTime(message.createdAt)} · ${outgoing ? message.status : "received"}`}
          >
            {message.text && (
              <button
                type="button"
                onClick={() => onCopyMessage(message.id, message.text ?? "")}
                aria-label="Copy message"
                className={`rounded p-0.5 leading-none transition-opacity cursor-pointer ${
                  outgoing ? "hover:bg-white/15" : "hover:bg-surface-well"
                } ${copiedMessageId === message.id ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`}
              >
                {copiedMessageId === message.id ? (
                  <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 9h10v10H9V9zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"
                    />
                  </svg>
                )}
              </button>
            )}
            <span>{formatTime(message.createdAt)}</span>
            {outgoing && status.text ? <span className={status.color}>{status.text}</span> : null}
          </div>
        </div>
      </div>
    </Fragment>
  );
});
