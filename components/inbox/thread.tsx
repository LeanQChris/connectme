"use client";

import { useEffect, useRef } from "react";

import type { ConversationSummary, Message, MessageStatus } from "@/lib/types";

import { ChannelDot, channelMeta } from "./channel-badge";
import { formatTime } from "./format";
import ReplyBox from "./reply-box";
import ReplyWindowBar from "./reply-window";

interface Props {
  conversation: ConversationSummary;
  messages: Message[];
  onBack: () => void;
  onSend: (text: string) => Promise<void>;
}

/** WhatsApp-style read receipts, one glyph per delivery step. */
const STATUS_GLYPH: Record<MessageStatus, string> = {
  received: "",
  sent: "✓",
  delivered: "✓✓",
  read: "✓✓",
  failed: "!",
};

export default function Thread({ conversation, messages, onBack, onSend }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const windowOpen = conversation.window.open;

  // Keep the newest message in view.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-bg">
      <header className="flex items-center gap-2.5 border-b border-hairline px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1.5 rounded-md p-1 text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M10 3.5 5.5 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <ChannelDot channel={conversation.channel} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{conversation.contactName}</p>
          <p className="truncate font-mono text-[11px] text-ink-muted">
            {channelMeta(conversation.channel).label.toLowerCase()} · {conversation.contactExternalId}
          </p>
        </div>
      </header>

      <ReplyWindowBar lastInboundAt={conversation.lastInboundAt} />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="pt-8 text-center text-[13px] text-ink-muted">No messages in this thread yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {messages.map((message) => {
              const outgoing = message.direction === "out";
              const glyph = STATUS_GLYPH[message.status];
              return (
                <li key={message.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-[13px] leading-relaxed sm:max-w-[65%] ${
                      outgoing
                        ? "bg-bubble-out text-on-bubble-out"
                        : "bg-bubble-in text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.text ?? `[${message.type}]`}</p>
                    <p
                      className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] tabular-nums ${
                        outgoing ? "opacity-55" : "text-ink-muted"
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      {outgoing && glyph ? <span>{glyph}</span> : null}
                    </p>
                    {outgoing && message.error ? (
                      <p className="mt-1 border-t border-current/20 pt-1 font-mono text-[10px] leading-relaxed opacity-80">
                        {message.error}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ReplyBox disabled={!windowOpen} onSend={onSend} />
    </section>
  );
}