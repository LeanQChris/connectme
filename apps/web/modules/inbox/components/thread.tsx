"use client";

import type {
  ConversationStatus,
  ConversationSummary,
  Message,
} from "@/core/types";
import type { ConversationMetaPatch } from "../api/inbox.api";
import { useThread } from "../hooks/use-thread";
import { ThreadHeader } from "./thread-header";
import { MessageItem } from "./message-item";
import { LightboxModal } from "./lightbox-modal";
import ReplyBox, { type ReplyPayload } from "./reply-box";
import ReplyWindowBar from "./reply-window";

interface ThreadProps {
  conversation: ConversationSummary;
  messages: Message[];
  onBack: () => void;
  onSend: (payload: ReplyPayload) => Promise<void>;
  onSchedule: (payload: ReplyPayload, scheduledForIso: string) => Promise<void>;
  onNote: (text: string) => Promise<void>;
  onArchive: (status: ConversationStatus) => void;
  onMeta: (patch: ConversationMetaPatch) => void;
}

export default function Thread({
  conversation,
  messages,
  onBack,
  onSend,
  onSchedule,
  onNote,
  onArchive,
  onMeta,
}: ThreadProps) {
  const {
    scrollRef,
    copied,
    copyId,
    copiedMessageId,
    copyMessage,
    lightboxImage,
    openImage,
    closeLightbox,
    windowOpen,
    archived,
    channelInfo,
    firstResponse,
    unreadBoundary,
    unreadCount,
  } = useThread(conversation, messages);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col bg-canvas">
      {/* Lightbox Modal for Images */}
      <LightboxModal imageUrl={lightboxImage} onClose={closeLightbox} />

      {/* Thread Header */}
      <ThreadHeader
        conversation={conversation}
        channelInfo={channelInfo}
        archived={archived}
        copied={copied}
        firstResponse={firstResponse}
        onCopyId={copyId}
        onBack={onBack}
        onArchive={() => onArchive(archived ? "open" : "closed")}
        onMeta={onMeta}
      />

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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-ink">No messages in thread</p>
            <p className="mt-0.5 text-[12px] text-mute">
              Send a reply below to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((message, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];

            return (
              <MessageItem
                key={message.id}
                message={message}
                prevMessage={prev}
                nextMessage={next}
                conversation={conversation}
                unreadBoundary={unreadBoundary}
                unreadCount={message.id === unreadBoundary ? unreadCount : 0}
                copiedMessageId={copiedMessageId}
                onCopyMessage={copyMessage}
                onOpenImage={openImage}
              />
            );
          })
        )}
      </div>

      {/* Reply Input Box */}
      <ReplyBox
        disabled={!windowOpen}
        onSend={onSend}
        onSchedule={onSchedule}
        onNote={onNote}
      />
    </section>
  );
}