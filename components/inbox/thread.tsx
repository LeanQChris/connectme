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

function MessageAttachment({ message }: { message: Message }) {
  const { mediaUrl, type } = message;
  if (!mediaUrl) return null;

  if (type === "image") {
    return (
      <div className="mb-2 overflow-hidden rounded-[8px] border border-hairline bg-canvas">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt="Attachment"
            className="max-h-80 w-full object-cover rounded-[8px] transition-transform duration-200 group-hover:scale-[1.01]"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <span className="rounded-full bg-ink/90 px-3 py-1 text-[11px] font-medium text-on-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              Open image ↗
            </span>
          </div>
        </a>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="mb-2 overflow-hidden rounded-[8px] border border-hairline bg-canvas">
        <video
          src={mediaUrl}
          controls
          className="max-h-80 w-full rounded-[8px]"
          preload="metadata"
        />
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="mb-2 p-1">
        <audio src={mediaUrl} controls className="w-full max-w-xs" />
      </div>
    );
  }

  // Document / other files
  return (
    <div className="mb-2">
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-[8px] border border-hairline bg-canvas-elevated p-3 text-ink transition-colors hover:bg-surface-well"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas text-body">
          <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink group-hover:text-link transition-colors">
            {message.text || "Attached Document"}
          </p>
          <span className="font-mono text-[10.5px] text-mute">Click to view / download</span>
        </div>
        <svg
          className="h-3.5 w-3.5 shrink-0 text-mute group-hover:text-ink transition-colors"
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
    <section className="flex min-h-0 flex-1 flex-col bg-canvas">
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
                className={`inline-flex items-center rounded-full px-2 py-0.2 font-mono text-[10px] font-medium tracking-wide uppercase ${
                  conversation.channel === "messenger"
                    ? "bg-messenger/10 text-messenger"
                    : conversation.channel === "whatsapp"
                      ? "bg-whatsapp/10 text-whatsapp"
                      : "bg-pink-500/10 text-pink-500"
                }`}
              >
                {channelInfo.label}
              </span>
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
      </header>

      <ReplyWindowBar lastInboundAt={conversation.lastInboundAt} />

      {/* Messages Stream */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 space-y-4">
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
                    <div className="flex items-center justify-center my-4">
                      <span className="rounded-full border border-hairline bg-canvas-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mute shadow-2xs">
                        {msgDate}
                      </span>
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${outgoing ? "justify-end" : "justify-start"}`}>
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
                      className={`group relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 shadow-[0px_1px_1px_rgba(0,0,0,0.03)] transition-all ${
                        outgoing
                          ? "rounded-[12px] rounded-tr-[2px] bg-primary text-on-primary font-normal"
                          : "rounded-[12px] rounded-tl-[2px] border border-hairline bg-canvas-elevated text-ink font-normal"
                      }`}
                    >
                      {/* Media Attachment */}
                      <MessageAttachment message={message} />

                      {/* Message Text */}
                      {message.text &&
                        (!message.mediaUrl || message.type === "image" || message.type === "video") && (
                          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed select-text font-normal">
                            {message.text}
                          </p>
                        )}

                      {!message.text && !message.mediaUrl && (
                        <p className="italic text-[12px] opacity-70">[{message.type}]</p>
                      )}

                      <div
                        className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] tabular-nums select-none ${
                          outgoing ? "opacity-75" : "text-mute"
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
                        <div className="mt-2 rounded-[4px] border border-error/30 bg-error/10 p-2 font-mono text-[11px] leading-snug text-error">
                          <span className="font-bold block mb-0.5">Error:</span>
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