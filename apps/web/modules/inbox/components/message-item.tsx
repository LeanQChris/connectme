"use client";

import { Fragment, memo } from "react";
import Avatar from "@/components/ui/avatar";
import { formatTime } from "@/core/utils/format";
import type { ConversationSummary, Message, MessageStatus } from "@/core/types";
import { MessageAttachment } from "./message-attachment";
import { extractUrls, LinkPreviewCard } from "./link-preview-card";

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

  const isImage = message.type === "image" && message.mediaUrl;
  const isAudio = message.type === "audio" && message.mediaUrl;
  const isVideo = message.type === "video" && message.mediaUrl;
  const isDoc = message.type === "document" && message.mediaUrl;
  const isPureMedia =
    (isImage || isAudio || isVideo || isDoc) &&
    (!message.text ||
      message.text.startsWith("[") ||
      message.text === "Photo Attachment" ||
      message.text === "Video message" ||
      message.text === "Attached Document");

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
          runStart ? "mt-4" : "mt-1.5"
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

        {/* 1. Pure Single Image (No outer bubble) */}
        {isImage && isPureMedia ? (
          <div className="group/media relative max-w-[85%] sm:max-w-[360px] overflow-hidden rounded-[14px] border border-hairline/80 shadow-2xs bg-black/5 dark:bg-white/5 cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.mediaUrl!}
              alt="Photo attachment"
              onClick={() => onOpenImage(message.mediaUrl!)}
              className="max-h-[380px] w-auto max-w-full rounded-[14px] object-contain transition-transform duration-300 group-hover/media:scale-[1.015]"
              loading="lazy"
            />
            <div
              onClick={() => onOpenImage(message.mediaUrl!)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover/media:bg-black/20"
            >
              <span className="rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-all duration-200 group-hover/media:opacity-100 flex items-center gap-1.5 backdrop-blur-md scale-95 group-hover/media:scale-100">
                <span>View full size</span>
                <span>↗</span>
              </span>
            </div>
            {/* Floating timestamp pill */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-md shadow-sm pointer-events-none">
              <span>{formatTime(message.createdAt)}</span>
              {outgoing && status?.text ? <span className={status.color}>{status.text}</span> : null}
            </div>
          </div>
        ) : isAudio && isPureMedia ? (
          /* 2. Standalone Audio Message Pill */
          <div
            className={`flex items-center gap-2 rounded-[22px] border px-3.5 py-1.5 shadow-2xs ${
              outgoing
                ? "bg-primary/10 border-primary/20 text-ink"
                : "bg-canvas-elevated border-hairline text-ink"
            }`}
          >
            <span className="text-base">🎵</span>
            <audio src={message.mediaUrl!} controls className="h-8 max-w-[200px] sm:max-w-[240px]" />
            <span className="font-mono text-[10px] text-mute shrink-0 pl-1">
              {formatTime(message.createdAt)}
            </span>
            {outgoing && status?.text ? <span className={status.color}>{status.text}</span> : null}
          </div>
        ) : isVideo && isPureMedia ? (
          /* 3. Standalone Video Player */
          <div className="relative overflow-hidden rounded-[14px] bg-black border border-hairline shadow-2xs max-w-[320px]">
            <video
              src={message.mediaUrl!}
              controls
              playsInline
              className="max-h-[340px] w-full rounded-[14px]"
              preload="metadata"
            />
          </div>
        ) : isDoc && isPureMedia ? (
          /* 4. Standalone Document Attachment Card */
          <a
            href={message.mediaUrl!}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="group flex items-center gap-3 rounded-[12px] border border-hairline bg-canvas-elevated p-3 text-left text-ink transition-colors hover:bg-surface-well shadow-2xs max-w-[300px]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-hairline bg-surface-well font-mono text-[10.5px] font-bold text-body">
              {((message.text || "DOC").split(".").pop() || "DOC").slice(0, 4).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">
                {message.text && message.text !== "[document]" ? message.text : "Document"}
              </p>
              <span className="font-mono text-[10px] text-mute flex items-center gap-1">
                <span>{formatTime(message.createdAt)}</span>
                <span>· Download ↓</span>
              </span>
            </div>
          </a>
        ) : onlyEmoji ? (
          /* 5. Pure Emoji Message */
          <div className="text-4xl leading-tight select-text py-1">{message.text}</div>
        ) : (
          /* 6. Standard Text Message (or message with caption) - CHAT BUBBLE */
          <div
            className={`group relative max-w-[78%] leading-[1.55] sm:max-w-[68%] px-3.5 py-2 text-[13px] shadow-2xs ${
              outgoing
                ? "rounded-[16px] rounded-br-[4px] bg-primary text-on-primary"
                : "rounded-[16px] rounded-bl-[4px] bg-canvas-elevated text-ink ring-1 ring-hairline ring-inset"
            }`}
          >
            {/* Attached media with caption */}
            {message.type !== "text" && (
              <div className="mb-2">
                <MessageAttachment message={message} onOpenImage={onOpenImage} />
              </div>
            )}

            {message.text && (
              <p className="whitespace-pre-wrap break-words select-text">{message.text}</p>
            )}

            {/* Link Preview Card */}
            {message.type === "text" && message.text && (
              extractUrls(message.text).slice(0, 1).map((url) => (
                <LinkPreviewCard key={url} url={url} />
              ))
            )}

            {message.error ? (
              <div className="mt-1.5 rounded-[6px] border border-error/30 bg-error/10 px-2 py-1.5 font-mono text-[11px] leading-snug text-error">
                <span className="block font-bold">{message.error}</span>
              </div>
            ) : null}

            {/* Metadata: quiet until hover, ticks only on outgoing. */}
            <div
              className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] tabular-nums select-none ${
                outgoing ? "opacity-65" : "text-mute opacity-75"
              } group-hover:opacity-100`}
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
              {outgoing && status?.text ? <span className={status.color}>{status.text}</span> : null}
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
});
