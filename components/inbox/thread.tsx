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

import FileCard from "./file-card";
import FormattedText from "./formatted-text";
import ImageGallery, { Lightbox } from "./image-gallery";
import LinkPreviewCard from "./link-preview-card";
import ReplyBox, { type ReplyPayload } from "./reply-box";
import ReplyWindowBar from "./reply-window";
import { extractUrlsFromMessage } from "@/lib/link-extractor";
import { getProxiedMediaUrl } from "@/lib/media";

interface Props {
  conversation: ConversationSummary;
  messages: Message[];
  onBack: () => void;
  onSend: (payload: ReplyPayload) => Promise<void>;
  onNote: (text: string) => Promise<void>;
  onArchive: (status: ConversationStatus) => void;
  onDelete?: () => void;
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

interface SingleItem {
  type: "single";
  message: Message;
  id: string;
  createdAt: string;
  direction: "in" | "out" | "note";
  status: MessageStatus;
}

interface ImageGroupItem {
  type: "image_group";
  messages: Message[];
  id: string;
  createdAt: string;
  direction: "in" | "out";
  status: MessageStatus;
}

type ClusterItem = SingleItem | ImageGroupItem;

function clusterMessages(messages: Message[]): ClusterItem[] {
  const result: ClusterItem[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.type === "image" && msg.mediaUrl && msg.direction !== "note") {
      const group: Message[] = [msg];
      let j = i + 1;

      while (j < messages.length) {
        const next = messages[j];
        if (
          next.type === "image" &&
          next.mediaUrl &&
          next.direction === msg.direction &&
          (!next.text || next.text.startsWith("[")) &&
          Math.abs(new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 180000
        ) {
          group.push(next);
          j++;
        } else {
          break;
        }
      }

      if (group.length > 1) {
        result.push({
          type: "image_group",
          messages: group,
          id: group.map((m) => m.id).join("_"),
          createdAt: group[group.length - 1].createdAt,
          direction: msg.direction as "in" | "out",
          status: group[group.length - 1].status,
        });
        i = j;
        continue;
      }
    }

    result.push({
      type: "single",
      message: msg,
      id: msg.id,
      createdAt: msg.createdAt,
      direction: msg.direction,
      status: msg.status,
    });
    i++;
  }

  return result;
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
        className="h-8 max-w-[84px] xs:max-w-[96px] sm:max-w-none appearance-none rounded-[6px] border border-hairline bg-canvas-elevated pl-2 pr-5 sm:pr-6 text-[11.5px] sm:text-[12px] text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink focus:outline-none truncate"
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



export default function Thread({
  conversation,
  messages,
  onBack,
  onSend,
  onNote,
  onArchive,
  onDelete,
  onMeta,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<
    { id: string; url: string; text?: string | null; createdAt: string }[] | null
  >(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const windowOpen = conversation.window.open;
  const archived = conversation.status === "closed";

  const clusteredItems = useMemo(() => clusterMessages(messages), [messages]);

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

  const isChannel =
    conversation.contactName.startsWith("#") ||
    (conversation.channel === "slack" &&
      (conversation.contactExternalId.startsWith("C") ||
        conversation.contactExternalId.startsWith("G")));

  const displayName = isChannel
    ? conversation.contactName.startsWith("#")
      ? conversation.contactName
      : `#${conversation.contactName || conversation.contactExternalId}`
    : conversation.contactName;

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
      {/* Enhanced Lightbox Modal for Images */}
      {lightboxImages && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}

      {/* Thread Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-canvas-elevated px-2.5 sm:px-4 gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-body transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well md:hidden"
          >
            <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <Avatar
            name={displayName}
            avatarUrl={conversation.avatarUrl}
            channel={conversation.channel}
            size="sm"
            isChannel={isChannel}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="truncate text-[13px] sm:text-[14px] font-semibold tracking-[-0.02em] text-ink">
                {displayName}
              </h2>
              {isChannel ? (
                <span className="inline-flex items-center rounded-full bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#E01E5A]/10 dark:text-[#E01E5A] px-1.5 sm:px-2 py-0.2 font-mono text-[9.5px] sm:text-[10px] font-semibold tracking-wide uppercase shrink-0">
                  Channel
                </span>
              ) : (
                <span
                  className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.2 font-mono text-[9.5px] sm:text-[10px] font-medium tracking-wide uppercase shrink-0 ${channelInfo.soft}`}
                >
                  {channelInfo.label}
                </span>
              )}
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
                onClick={copyId}
                title="Copy ID"
                className="rounded p-0.5 text-mute hover:bg-surface-well hover:text-ink transition-colors shrink-0"
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

          <AssigneePicker value={conversation.assignee} onChange={(assignee) => onMeta({ assignee })} />

          <TagPicker tags={conversation.tags} onChange={(tags) => onMeta({ tags })} />

          <button
            type="button"
            onClick={() => onArchive(archived ? "open" : "closed")}
            title={archived ? "Restore to inbox" : "Archive conversation"}
            className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2 sm:px-2.5 text-[12px] font-medium text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink active:scale-95 cursor-pointer"
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

          {onDelete && (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              title="Delete conversation permanently"
              className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2 sm:px-2.5 text-[12px] font-medium text-mute shadow-2xs transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 active:scale-95 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
      </header>

      {/* Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-[10px] border border-hairline bg-canvas-elevated p-5 shadow-xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-[14px] font-semibold text-ink">
                  Delete Conversation
                </h3>
                <p className="mt-0.5 text-[12px] text-mute">
                  Delete conversation with{" "}
                  <span className="font-medium text-ink">{conversation.contactName}</span>?
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] text-body leading-relaxed">
              All messages and thread history will be permanently erased. This action cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="rounded-[6px] border border-hairline bg-canvas px-3 py-1.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  onDelete?.();
                }}
                className="rounded-[6px] bg-red-500 px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 active:scale-95 cursor-pointer shadow-2xs"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

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
        {clusteredItems.length === 0 ? (
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
          clusteredItems.map((item, i) => {
            const isGroup = item.type === "image_group";
            const message = item.type === "single" ? item.message : item.messages[0];
            const isNote = item.direction === "note";
            const outgoing = item.direction === "out";
            const status = STATUS_GLYPH[item.status];
            const prev = clusteredItems[i - 1];
            const next = clusteredItems[i + 1];
            const day = formatDateDivider(item.createdAt);
            const prevCreatedAt = prev?.createdAt;
            const showDivider = !prevCreatedAt || formatDateDivider(prevCreatedAt) !== day;
            const runStart = showDivider || !prev || prev.direction !== item.direction;
            const showAvatar = !outgoing && !isNote && (!next || next.direction !== item.direction);
            const unreadCount =
              item.id === unreadBoundary
                ? messages.filter(
                    (m) => m.direction === "in" && m.createdAt > (conversation.lastReadAt ?? ""),
                  ).length
                : 0;

            if (isNote) {
              return (
                <div
                  key={item.id}
                  className={`flex items-stretch gap-2.5 sm:gap-3 ${
                    runStart ? "mt-4" : "mt-1.5"
                  }`}
                >
                  <span
                    aria-hidden
                    className="w-0.5 shrink-0 self-stretch rounded-full bg-warning/45"
                  />
                  <div className="group min-w-0 flex-1 border-y border-dashed border-warning/25 py-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] text-warning">
                        Internal note
                      </span>
                      {message.author && (
                        <span className="truncate font-mono text-[10px] text-body">
                          {message.author}
                        </span>
                      )}
                      <span
                        aria-hidden
                        className="h-px flex-1 bg-hairline opacity-0 transition-opacity group-hover:opacity-100"
                      />
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-mute opacity-70 transition-opacity group-hover:opacity-100">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-body select-text">
                      {message.text}
                    </p>
                  </div>
                </div>
              );
            }

            // Image Group / Photo Album Collage (No chat bubble wrapper)
            if (isGroup) {
              const galleryImages = item.messages.map((m) => ({
                id: m.id,
                url: getProxiedMediaUrl(m.mediaUrl, { channel: m.channel, name: m.text }),
                text: m.text,
                createdAt: m.createdAt,
              }));

              return (
                <Fragment key={item.id}>
                  {showDivider && (
                    <div className="my-5 flex items-center justify-center first:mt-0">
                      <span className="rounded-full border border-hairline bg-canvas-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mute shadow-2xs">
                        {day}
                      </span>
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

                    <div className="group relative max-w-[85%] sm:max-w-[420px] select-none">
                      <ImageGallery
                        images={galleryImages}
                        outgoing={outgoing}
                        onOpenLightbox={(idx) => {
                          setLightboxImages(galleryImages);
                          setLightboxIndex(idx);
                        }}
                      />

                      {/* Floating translucent timestamp badge */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-md shadow-sm pointer-events-none">
                        <span className="font-sans font-medium text-[9.5px]">📷 {galleryImages.length}</span>
                        <span>·</span>
                        <span>{formatTime(item.createdAt)}</span>
                        {outgoing && status.text ? <span className={status.color}>{status.text}</span> : null}
                      </div>
                    </div>
                  </div>
                </Fragment>
              );
            }

            // Single Message
            const hasMedia = Boolean(message.mediaUrl);
            const onlyEmoji = isOnlyEmoji(message.text) && !hasMedia;
            const isImage = message.type === "image" && message.mediaUrl;
            const isAudio = message.type === "audio" && message.mediaUrl;
            const isVideo = message.type === "video" && message.mediaUrl;
            const isDoc = message.type === "document" || (message.type !== "text" && message.mediaUrl);

            return (
              <Fragment key={item.id}>
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

                  {/* 1. Standalone Image */}
                  {isImage ? (
                    (() => {
                      const proxiedImgUrl = getProxiedMediaUrl(message.mediaUrl, {
                        channel: message.channel,
                        name: message.text,
                      });
                      const hasCaption =
                        message.text &&
                        !message.text.startsWith("[") &&
                        message.text !== "Photo Attachment" &&
                        message.text !== message.mediaUrl;

                      return (
                        <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[360px]">
                          <div className="group/media relative overflow-hidden rounded-[14px] border border-hairline/80 shadow-2xs bg-black/5 dark:bg-white/5 cursor-pointer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={proxiedImgUrl}
                              alt={message.text || "Photo attachment"}
                              onClick={() => {
                                setLightboxImages([
                                  {
                                    id: message.id,
                                    url: proxiedImgUrl,
                                    text: message.text,
                                    createdAt: message.createdAt,
                                  },
                                ]);
                                setLightboxIndex(0);
                              }}
                              className="max-h-[380px] w-auto max-w-full rounded-[14px] object-contain transition-transform duration-300 group-hover/media:scale-[1.015]"
                              loading="lazy"
                            />
                            <div
                              onClick={() => {
                                setLightboxImages([
                                  {
                                    id: message.id,
                                    url: proxiedImgUrl,
                                    text: message.text,
                                    createdAt: message.createdAt,
                                  },
                                ]);
                                setLightboxIndex(0);
                              }}
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
                              {outgoing && status.text ? (
                                <span className={status.color}>{status.text}</span>
                              ) : null}
                            </div>
                          </div>
                          {hasCaption && (
                            <div
                              className={`px-1.5 py-0.5 text-[12.5px] ${
                                outgoing ? "text-right text-mute" : "text-left text-ink"
                              }`}
                            >
                              <FormattedText text={message.text} outgoing={false} />
                              {extractUrlsFromMessage(message.text).slice(0, 1).map((url) => (
                                <LinkPreviewCard key={url} url={url} outgoing={outgoing} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : isAudio ? (
                    /* 2. Standalone Audio Message Pill */
                    (() => {
                      const proxiedAudioUrl = getProxiedMediaUrl(message.mediaUrl, {
                        channel: message.channel,
                      });
                      return (
                        <div
                          className={`flex items-center gap-2 rounded-[22px] border px-3.5 py-1.5 shadow-2xs ${
                            outgoing
                              ? "bg-primary/10 border-primary/20 text-ink"
                              : "bg-canvas-elevated border-hairline text-ink"
                          }`}
                        >
                          <span className="text-base">🎵</span>
                          <audio
                            src={proxiedAudioUrl}
                            controls
                            className="h-8 max-w-[200px] sm:max-w-[240px]"
                          />
                          <span className="font-mono text-[10px] text-mute shrink-0 pl-1">
                            {formatTime(message.createdAt)}
                          </span>
                          {outgoing && status.text ? (
                            <span className={status.color}>{status.text}</span>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : isVideo ? (
                    /* 3. Standalone Video Player */
                    (() => {
                      const proxiedVideoUrl = getProxiedMediaUrl(message.mediaUrl, {
                        channel: message.channel,
                      });
                      const hasCaption =
                        message.text &&
                        !message.text.startsWith("[") &&
                        message.text !== "Video message" &&
                        message.text !== message.mediaUrl;

                      return (
                        <div className="flex flex-col gap-1 max-w-[320px]">
                          <div className="relative overflow-hidden rounded-[14px] bg-black border border-hairline shadow-2xs">
                            <video
                              src={proxiedVideoUrl}
                              controls
                              playsInline
                              className="max-h-[340px] w-full rounded-[14px]"
                              preload="metadata"
                            />
                          </div>
                          {hasCaption && (
                            <div
                              className={`px-1.5 py-0.5 text-[12.5px] ${
                                outgoing ? "text-right text-mute" : "text-left text-ink"
                              }`}
                            >
                              <FormattedText text={message.text} outgoing={false} />
                              {extractUrlsFromMessage(message.text).slice(0, 1).map((url) => (
                                <LinkPreviewCard key={url} url={url} outgoing={outgoing} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : isDoc ? (
                    /* 4. Standalone Document Attachment Card (No chat bubble wrapper!) */
                    <FileCard
                      filename={message.text}
                      mediaUrl={message.mediaUrl}
                      channel={message.channel}
                      createdAt={message.createdAt}
                      outgoing={outgoing}
                    />
                  ) : onlyEmoji ? (
                    /* 5. Pure Emoji Message */
                    <div className="text-4xl leading-tight select-text py-1">
                      {message.text}
                    </div>
                  ) : (
                    /* 6. Text Only Message - CHAT BUBBLE */
                    (() => {
                      const previewUrls = extractUrlsFromMessage(message.text);
                      const hasPreviews = previewUrls.length > 0;

                      return (
                        <div
                          className={`group relative leading-[1.55] px-3.5 py-2 text-[13px] shadow-2xs ${
                            hasPreviews
                              ? "w-full max-w-[88%] sm:max-w-[440px]"
                              : "max-w-[78%] sm:max-w-[68%]"
                          } ${
                            outgoing
                              ? "rounded-[16px] rounded-br-[4px] bg-primary text-on-primary"
                              : "rounded-[16px] rounded-bl-[4px] bg-canvas-elevated text-ink ring-1 ring-hairline ring-inset"
                          }`}
                        >
                          {message.text && (
                            <FormattedText text={message.text} outgoing={outgoing} />
                          )}

                          {/* Rich Link & Video Previews (YouTube, Loom, Web) */}
                          {previewUrls.slice(0, 2).map((url) => (
                            <LinkPreviewCard key={url} url={url} outgoing={outgoing} />
                          ))}

                          {message.error ? (
                            <div className="mt-1.5 rounded-[6px] border border-error/30 bg-error/10 px-2 py-1.5 font-mono text-[11px] leading-snug text-error">
                              <span className="block font-bold">{message.error}</span>
                            </div>
                          ) : null}

                      {/* Metadata footer */}
                      <div
                        className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] tabular-nums select-none ${
                          outgoing ? "opacity-65" : "text-mute opacity-75"
                        } group-hover:opacity-100`}
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
                            } ${
                              copiedMessageId === message.id
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-70"
                            } cursor-pointer`}
                          >
                            {copiedMessageId === message.id ? (
                              <svg
                                className="h-3 w-3 stroke-current"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-3 w-3 stroke-current"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
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
                        {outgoing && status.text ? (
                          <span className={status.color}>{status.text}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })()
              )}
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