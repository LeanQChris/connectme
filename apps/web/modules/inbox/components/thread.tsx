"use client";

import { Fragment, useMemo, useState } from "react";
import type {
  ConversationStatus,
  ConversationSummary,
  Message,
} from "@/core/types";
import type { ConversationMetaPatch } from "../api/inbox.api";
import { useThread } from "../hooks/use-thread";
import { ThreadHeader } from "./thread-header";
import { MessageItem } from "./message-item";
import ImageGallery, { Lightbox } from "./image-gallery";
import ReplyBox, { type ReplyPayload } from "./reply-box";
import ReplyWindowBar from "./reply-window";
import Avatar from "@/components/ui/avatar";
import { formatTime } from "@/core/utils/format";
import { resolveMediaUrl } from "@/core/utils/media";
import { DeleteConversationModal } from "./delete-conversation-modal";

interface ThreadProps {
  conversation: ConversationSummary;
  messages: Message[];
  onBack: () => void;
  onSend: (payload: ReplyPayload) => Promise<void>;
  onSchedule: (payload: ReplyPayload, scheduledForIso: string) => Promise<void>;
  onNote: (text: string) => Promise<void>;
  onArchive: (status: ConversationStatus) => void;
  onDelete?: (id: string) => Promise<void>;
  onMeta: (patch: ConversationMetaPatch) => void;
}

export interface SingleItem {
  type: "single";
  message: Message;
  id: string;
  createdAt: string;
  direction: "in" | "out" | "note";
}

export interface ImageGroupItem {
  type: "image_group";
  messages: Message[];
  id: string;
  createdAt: string;
  direction: "in" | "out";
}

export type ClusterItem = SingleItem | ImageGroupItem;

export function clusterMessages(messages: Message[]): ClusterItem[] {
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
    });
    i++;
  }

  return result;
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

export default function Thread({
  conversation,
  messages,
  onBack,
  onSend,
  onSchedule,
  onNote,
  onArchive,
  onDelete,
  onMeta,
}: ThreadProps) {
  const {
    scrollRef,
    copied,
    copyId,
    copiedMessageId,
    copyMessage,
    windowOpen,
    archived,
    channelInfo,
    firstResponse,
    unreadBoundary,
    unreadCount,
  } = useThread(conversation, messages);

  const [lightboxImages, setLightboxImages] = useState<
    { id: string; url: string; text?: string | null; createdAt: string }[] | null
  >(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const clusteredItems = useMemo(() => clusterMessages(messages), [messages]);

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    await onDelete(conversation.id);
    setShowDeleteModal(false);
  };

  return (
    <section className="relative flex min-h-0 flex-1 flex-col bg-canvas">
      {/* Lightbox Modal for Images */}
      {lightboxImages && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConversationModal
        isOpen={showDeleteModal}
        contactName={conversation.contactName}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />

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
        onDelete={onDelete ? () => setShowDeleteModal(true) : undefined}
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
        {clusteredItems.length === 0 ? (
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
          clusteredItems.map((item, i) => {
            const isGroup = item.type === "image_group";
            const prev = clusteredItems[i - 1];
            const next = clusteredItems[i + 1];
            const day = formatDateDivider(item.createdAt);
            const prevCreatedAt = prev?.createdAt;
            const showDivider = !prevCreatedAt || formatDateDivider(prevCreatedAt) !== day;
            const runStart = showDivider || !prev || prev.direction !== item.direction;
            const outgoing = item.direction === "out";
            const showAvatar = !outgoing && item.direction !== "note" && (!next || next.direction !== item.direction);

            if (isGroup) {
              const galleryImages = item.messages.map((m) => ({
                id: m.id,
                url: resolveMediaUrl(m.mediaUrl, { channel: conversation.channel }),
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
                      </div>
                    </div>
                  </div>
                </Fragment>
              );
            }

            const message = item.message;
            return (
              <MessageItem
                key={message.id}
                message={message}
                prevMessage={prev?.type === "single" ? prev.message : undefined}
                nextMessage={next?.type === "single" ? next.message : undefined}
                conversation={conversation}
                unreadBoundary={unreadBoundary}
                unreadCount={message.id === unreadBoundary ? unreadCount : 0}
                copiedMessageId={copiedMessageId}
                onCopyMessage={copyMessage}
                onOpenImage={(url) => {
                  setLightboxImages([{ id: message.id, url, text: message.text, createdAt: message.createdAt }]);
                  setLightboxIndex(0);
                }}
              />
            );
          })
        )}
      </div>

      {/* Reply Input Box */}
      <ReplyBox
        disabled={!windowOpen}
        conversationId={conversation.id}
        contactName={conversation.contactName}
        channel={conversation.channel}
        lastMessages={messages}
        onSend={onSend}
        onSchedule={onSchedule}
        onNote={onNote}
      />
    </section>
  );
}