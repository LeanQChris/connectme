"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConversationStatus,
  ConversationSummary,
  Message,
  MessageStatus,
} from "@/lib/types";

import Avatar from "./avatar";
import { channelMeta } from "./channel-badge";
import { formatTime } from "./format";
import type { ConversationMetaPatch } from "@/lib/hooks/use-inbox";

import ReplyBox, { type ReplyPayload } from "./reply-box";
import ReplyWindowBar from "./reply-window";

interface Props {
  conversation: ConversationSummary;
  messages: Message[];
  onBack: () => void;
  onSend: (payload: ReplyPayload) => Promise<void>;
  onNote: (text: string) => Promise<void>;
  onArchive: (status: ConversationStatus) => void;
  onMeta: (patch: ConversationMetaPatch) => void;
}

const STATUS_GLYPH: Record<MessageStatus, { text: string; color: string }> = {
  received: { text: "", color: "" },
  sent: { text: "✓", color: "opacity-60" },
  delivered: { text: "✓✓", color: "opacity-60" },
  read: { text: "✓✓", color: "text-link font-medium" },
  failed: { text: "!", color: "text-error font-medium" },
};

/** Target first-response time used to colour the SLA chip. */
const SLA_TARGET_MS = 15 * 60 * 1000;

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  const hours = ms / 3_600_000;
  return hours < 24 ? `${hours.toFixed(1)}h` : `${Math.round(hours / 24)}d`;
}

const TEAM = ["unassigned", "ana", "ben", "chloe", "dev"];

function AssigneePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const current = value ?? "unassigned";
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Assignee</span>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value === "unassigned" ? null : event.target.value)}
        className="h-8 appearance-none rounded-[6px] border border-hairline bg-canvas-elevated pl-2 pr-6 text-[12px] text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink focus:outline-none"
      >
        {TEAM.map((member) => (
          <option key={member} value={member}>
            {member === "unassigned" ? "Unassigned" : member}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 h-3 w-3 text-mute"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
}

const TAG_PRESETS = ["billing", "shipping", "technical", "vip", "refund"];

function TagPicker({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function add(tag: string) {
    const clean = tag.trim().toLowerCase();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
    setDraft("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 items-center gap-1 rounded-[6px] border border-hairline bg-canvas-elevated px-2 text-[12px] text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink"
      >
        <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M7 7h10l-1 12H8L7 7zm3-4h4"
          />
        </svg>
        <span className="font-mono text-[11px] tabular-nums">{tags.length || "Tags"}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close tag menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-20 w-56 rounded-[8px] border border-hairline bg-canvas-elevated p-2 shadow-lg">
            <div className="mb-1.5 flex flex-wrap gap-1">
              {tags.length === 0 && (
                <span className="px-1 py-0.5 text-[11px] text-mute">No tags</span>
              )}
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onChange(tags.filter((t) => t !== tag))}
                  title="Remove tag"
                  className="flex items-center gap-1 rounded-full bg-surface-well px-2 py-0.5 font-mono text-[10.5px] text-body transition-colors hover:text-error"
                >
                  {tag}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                add(draft);
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add tag…"
                className="h-7 w-full rounded-[6px] border border-hairline bg-canvas px-2 text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
              />
            </form>

            <div className="mt-1.5 flex flex-wrap gap-1">
              {TAG_PRESETS.filter((tag) => !tags.includes(tag)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => add(tag)}
                  className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[10.5px] text-mute transition-colors hover:border-hairline-strong hover:text-ink"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
  // Test if string contains purely emoji characters
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)+$/u;
  return emojiRegex.test(trimmed);
}

function MessageAttachment({
  message,
  onOpenImage,
}: {
  message: Message;
  onOpenImage: (url: string) => void;
}) {
  const { mediaUrl, type } = message;
  if (!mediaUrl) return null;

  if (type === "image") {
    return (
      <div className="group/media relative block overflow-hidden rounded-[10px] cursor-pointer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Attachment"
          onClick={() => onOpenImage(mediaUrl)}
          className="max-h-80 w-full object-cover transition-transform duration-200 group-hover/media:scale-[1.02]"
          loading="lazy"
        />
        <div
          onClick={() => onOpenImage(mediaUrl)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/media:bg-black/25"
        >
          <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/media:opacity-100 flex items-center gap-1.5 backdrop-blur-sm">
            <span>View Full Size</span>
            <span>↗</span>
          </span>
        </div>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="overflow-hidden rounded-[10px] bg-black/10">
        <video
          src={mediaUrl}
          controls
          playsInline
          className="max-h-80 w-full rounded-[10px]"
          preload="metadata"
        />
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="flex items-center gap-2 rounded-[8px] bg-canvas-elevated p-2 border border-hairline my-1 max-w-[280px]">
        <span className="text-lg">🎵</span>
        <audio src={mediaUrl} controls className="h-8 w-full min-w-[200px]" />
      </div>
    );
  }

  // Document / other files
  const filename = message.text || "Attached Document";
  const ext = filename.split(".").pop()?.toUpperCase() || "DOC";

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="group flex items-center gap-3 rounded-[10px] border border-hairline bg-canvas p-2.5 text-left text-ink transition-colors hover:bg-surface-well"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas-elevated font-mono text-[10px] font-bold text-body">
        {ext.slice(0, 4)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{filename}</p>
        <span className="font-mono text-[10.5px] text-mute flex items-center gap-1">
          <span>Download file</span>
          <span>↓</span>
        </span>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-mute transition-transform group-hover:translate-y-0.5 group-hover:text-ink"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </a>
  );
}

export default function Thread({
  conversation,
  messages,
  onBack,
  onSend,
  onNote,
  onArchive,
  onMeta,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const windowOpen = conversation.window.open;
  const archived = conversation.status === "closed";

  // Scroll to bottom on new messages
  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  function copyId() {
    void navigator.clipboard.writeText(conversation.contactExternalId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const channelInfo = channelMeta(conversation.channel);

  // First outbound after the first inbound: the SLA the reply window is judged on.
  const firstResponse = useMemo(() => {
    const firstInbound = messages.find((m) => m.direction === "in");
    if (!firstInbound) return null;
    const reply = messages.find(
      (m) => m.direction === "out" && m.createdAt >= firstInbound.createdAt,
    );
    if (!reply) return null;
    return new Date(reply.createdAt).getTime() - new Date(firstInbound.createdAt).getTime();
  }, [messages]);

  // Messages that arrived after the thread was last opened.
  const unreadBoundary = useMemo(() => {
    if (!conversation.lastReadAt) return null;
    const at = new Date(conversation.lastReadAt).getTime();
    const pending = messages.filter(
      (m) => m.direction === "in" && new Date(m.createdAt).getTime() > at,
    );
    return pending.length > 0 ? pending[0].id : null;
  }, [messages, conversation.lastReadAt]);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col bg-canvas">
      {/* Lightbox Modal for Images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
            aria-label="Close image"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="max-h-[90vh] max-w-[90vw] rounded-[8px] object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Thread Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-canvas-elevated px-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="-ml-1 rounded-[6px] p-1 text-body transition-colors hover:bg-surface-well hover:text-ink md:hidden"
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
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-ink">
                {conversation.contactName}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.2 font-mono text-[10px] font-medium tracking-wide uppercase ${channelInfo.soft}`}
              >
                {channelInfo.label}
              </span>
              {archived && (
                <span className="inline-flex items-center rounded-full bg-surface-well px-2 py-0.2 font-mono text-[10px] font-medium tracking-wide uppercase text-mute">
                  Archived
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-mute">
              <span className="font-mono">{conversation.contactExternalId}</span>
              <button
                type="button"
                onClick={copyId}
                title="Copy ID"
                className="rounded p-0.5 text-mute hover:bg-surface-well hover:text-ink transition-colors"
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

        <div className="flex shrink-0 items-center gap-2">
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

          <AssigneePicker value={conversation.assignee} onChange={(assignee) => onMeta({ assignee })} />

          <TagPicker tags={conversation.tags} onChange={(tags) => onMeta({ tags })} />

          <button
            type="button"
            onClick={() => onArchive(archived ? "open" : "closed")}
            title={archived ? "Restore to inbox" : "Archive conversation"}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink"
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
          </button>
        </div>
      </header>

      {archived && (
        <div className="flex items-center gap-2 border-b border-hairline bg-surface-well px-4 py-2 text-[11px] text-body">
          <svg className="h-3.5 w-3.5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M3 3h18v5H3z"
            />
          </svg>
          <span>
            This conversation is archived. It stays in the thread history until the customer messages
            again.
          </span>
        </div>
      )}

      <ReplyWindowBar lastInboundAt={conversation.lastInboundAt} channel={conversation.channel} />

      {/* Messages Stream */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] border border-hairline bg-canvas-elevated text-body shadow-2xs">
              <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-ink">No messages in thread</p>
            <p className="mt-0.5 text-[12px] text-mute">Send a reply below to start the conversation.</p>
          </div>
        ) : (
          messages.map((message, i) => {
            const isNote = message.direction === "note";
            const outgoing = message.direction === "out";
            const status = STATUS_GLYPH[message.status];
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const day = formatDateDivider(message.createdAt);
            const showDivider = !prev || formatDateDivider(prev.createdAt) !== day;
            const runStart = showDivider || !prev || prev.direction !== message.direction;
            // Avatar only under the last bubble of an inbound run.
            const showAvatar = !outgoing && !isNote && (!next || next.direction !== message.direction);
            const hasMedia = Boolean(message.mediaUrl);
            const onlyEmoji = isOnlyEmoji(message.text) && !hasMedia;
            const caption =
              message.text && (message.type === "image" || message.type === "video" || !hasMedia);
            const unreadCount =
              message.id === unreadBoundary
                ? messages.filter(
                    (m) => m.direction === "in" && m.createdAt > (conversation.lastReadAt ?? ""),
                  ).length
                : 0;

            if (isNote) {
              return (
                <div key={message.id} className="my-3 flex justify-center">
                  <div className="group max-w-[80%] rounded-[10px] border border-warning/30 bg-warning/10 px-3 py-2 sm:max-w-[70%]">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-warning">
                      <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3H8a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z" />
                      </svg>
                      Note{message.author ? ` · ${message.author}` : ""}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-body select-text">
                      {message.text}
                    </p>
                    <div className="mt-1 text-right font-mono text-[10px] tabular-nums text-mute opacity-70 group-hover:opacity-100">
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Fragment key={message.id}>
                {showDivider && (
                  <div className="my-5 flex items-center justify-center first:mt-0">
                    <span className="rounded-full border border-hairline bg-canvas-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mute shadow-2xs">
                      {day}
                    </span>
                  </div>
                )}

                {unreadCount > 0 && (
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
                    {hasMedia && (
                      <MessageAttachment
                        message={message}
                        onOpenImage={(url) => setLightboxImage(url)}
                      />
                    )}

                    {onlyEmoji ? (
                      <div className="text-3xl leading-tight select-text py-0.5">
                        {message.text}
                      </div>
                    ) : (
                      caption && (
                        <p
                          className={`whitespace-pre-wrap break-words select-text ${
                            hasMedia ? "px-1.5 pt-1.5" : ""
                          }`}
                        >
                          {message.text}
                        </p>
                      )
                    )}

                    {!message.text && !hasMedia && (
                      <p className="italic opacity-70">[{message.type}]</p>
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
                      title={`${formatTime(message.createdAt)} · ${
                        outgoing ? message.status : "received"
                      }`}
                    >
                      {message.text && (
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(message.text ?? "");
                            setCopiedMessageId(message.id);
                            setTimeout(() => setCopiedMessageId(null), 1500);
                          }}
                          aria-label="Copy message"
                          className={`rounded p-0.5 leading-none transition-opacity ${
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
          })
        )}
      </div>

      {/* Reply Input Box */}
      <ReplyBox disabled={!windowOpen} onSend={onSend} onNote={onNote} />
    </section>
  );
}