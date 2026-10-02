"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationSummary, Message, MessageStatus } from "@/lib/types";

import Avatar from "./avatar";
import { channelMeta } from "./channel-badge";
import { formatTime } from "./format";
import ReplyBox from "./reply-box";
import ReplyWindowBar from "./reply-window";

interface Props {
  conversation: ConversationSummary;
  messages: Message[];
  onBack: () => void;
  onSend: (text: string) => Promise<void>;
}

/** WhatsApp / Messenger style delivery status glyphs */
const STATUS_GLYPH: Record<MessageStatus, { text: string; color: string }> = {
  received: { text: "", color: "" },
  sent: { text: "✓", color: "opacity-70" },
  delivered: { text: "✓✓", color: "opacity-70" },
  read: { text: "✓✓", color: "text-sky-300 font-bold" },
  failed: { text: "!", color: "text-rose-300 font-bold" },
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

function MessageAttachment({ message }: { message: Message }) {
  const { mediaUrl, type } = message;
  if (!mediaUrl) return null;

  if (type === "image") {
    return (
      <div className="mb-2.5 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block relative"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt="Attachment"
            className="max-h-80 w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-xs transition-all font-medium shadow-md">
              View original
            </span>
          </div>
        </a>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="mb-2.5 overflow-hidden rounded-xl bg-black/20 ring-1 ring-black/10 dark:ring-white/10">
        <video
          src={mediaUrl}
          controls
          className="max-h-80 w-full rounded-xl"
          preload="metadata"
        />
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="mb-2.5 p-1">
        <audio src={mediaUrl} controls className="w-full max-w-xs" />
      </div>
    );
  }

  // Document / other files
  return (
    <div className="mb-2.5">
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3 text-ink transition-all hover:bg-surface-2 hover:shadow-xs group"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
          <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium group-hover:text-accent transition-colors">
            {message.text || "View attached document"}
          </p>
          <span className="text-[11px] text-ink-muted">Click to open / download</span>
        </div>
        <svg
          className="h-4 w-4 shrink-0 text-ink-muted group-hover:text-accent transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}

export default function Thread({ conversation, messages, onBack, onSend }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const windowOpen = conversation.window.open;

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

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-bg">
      {/* Thread Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-surface/70 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="-ml-1 rounded-lg p-1.5 text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
          >
            <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <Avatar
            name={conversation.contactName}
            avatarUrl={conversation.avatarUrl}
            channel={conversation.channel}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[14px] font-semibold tracking-tight text-ink">
                {conversation.contactName}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                  conversation.channel === "messenger"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20"
                    : conversation.channel === "whatsapp"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                      : "bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-1 ring-pink-500/20"
                }`}
              >
                {channelInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <span className="font-mono">{conversation.contactExternalId}</span>
              <button
                type="button"
                onClick={copyId}
                title="Copy ID"
                className="rounded p-0.5 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
              >
                {copied ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
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
      </header>

      <ReplyWindowBar lastInboundAt={conversation.lastInboundAt} />

      {/* Messages Stream */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-surface-2 flex items-center justify-center text-ink-muted mb-3 ring-1 ring-hairline shadow-xs">
              💬
            </div>
            <p className="text-[14px] font-semibold text-ink">No messages in this thread yet</p>
            <p className="text-[12px] text-ink-muted mt-1">Send a reply below to begin.</p>
          </div>
        ) : (
          (() => {
            let lastDate = "";
            return messages.map((message) => {
              const outgoing = message.direction === "out";
              const status = STATUS_GLYPH[message.status];
              const msgDate = formatDateDivider(message.createdAt);
              const showDivider = msgDate !== lastDate;
              lastDate = msgDate;

              return (
                <div key={message.id} className="space-y-3">
                  {showDivider && (
                    <div className="flex items-center justify-center my-5">
                      <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-[10.5px] font-medium text-ink-muted shadow-2xs border border-hairline">
                        {msgDate}
                      </span>
                    </div>
                  )}

                  <div className={`flex items-end gap-2.5 ${outgoing ? "justify-end" : "justify-start"}`}>
                    {!outgoing && (
                      <Avatar
                        name={conversation.contactName}
                        avatarUrl={conversation.avatarUrl}
                        channel={conversation.channel}
                        size="sm"
                        showChannelBadge={false}
                        className="mb-0.5 shadow-2xs"
                      />
                    )}

                    <div
                      className={`group relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs transition-all ${
                        outgoing
                          ? "rounded-tr-xs bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/10 shadow-md font-normal"
                          : "rounded-tl-xs bg-surface border border-hairline text-ink font-normal shadow-xs"
                      }`}
                    >
                      {/* Media Attachment */}
                      <MessageAttachment message={message} />

                      {/* Message Text */}
                      {message.text &&
                        (!message.mediaUrl || message.type === "image" || message.type === "video") && (
                          <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed select-text font-normal">
                            {message.text}
                          </p>
                        )}

                      {!message.text && !message.mediaUrl && (
                        <p className="italic text-[13px] opacity-70">[{message.type}]</p>
                      )}

                      <div
                        className={`mt-1.5 flex items-center justify-end gap-1.5 font-mono text-[10px] tabular-nums select-none ${
                          outgoing ? "text-blue-100/75" : "text-ink-muted"
                        }`}
                      >
                        <span>{formatTime(message.createdAt)}</span>
                        {outgoing && status.text ? (
                          <span className={status.color} title={`Delivery status: ${message.status}`}>
                            {status.text}
                          </span>
                        ) : null}
                      </div>

                      {outgoing && message.error ? (
                        <div className="mt-2.5 rounded-lg bg-red-950/50 border border-red-500/40 p-2.5 font-mono text-[11px] leading-snug text-red-200">
                          <span className="font-bold block mb-0.5 text-red-300">Delivery Error:</span>
                          {message.error}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Reply Input Box */}
      <ReplyBox disabled={!windowOpen} onSend={onSend} />
    </section>
  );
}