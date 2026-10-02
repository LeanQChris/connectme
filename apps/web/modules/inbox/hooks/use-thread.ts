"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConversationSummary, Message } from "@/core/types";
import { channelMeta } from "@/components/ui/channel-badge";

export function useThread(conversation: ConversationSummary, messages: Message[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const windowOpen = conversation.window.open;
  const archived = conversation.status === "closed";
  const channelInfo = channelMeta(conversation.channel);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const copyId = useCallback(() => {
    void navigator.clipboard.writeText(conversation.contactExternalId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [conversation.contactExternalId]);

  const copyMessage = useCallback((messageId: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 1500);
  }, []);

  const openImage = useCallback((url: string) => {
    setLightboxImage(url);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  // First outbound after the first inbound: SLA measurement
  const firstResponse = useMemo(() => {
    const firstInbound = messages.find((m) => m.direction === "in");
    if (!firstInbound) return null;
    const reply = messages.find(
      (m) => m.direction === "out" && m.createdAt >= firstInbound.createdAt,
    );
    if (!reply) return null;
    return new Date(reply.createdAt).getTime() - new Date(firstInbound.createdAt).getTime();
  }, [messages]);

  // Messages that arrived after the thread was last opened
  const { unreadBoundary, unreadCount } = useMemo(() => {
    if (!conversation.lastReadAt) return { unreadBoundary: null, unreadCount: 0 };
    const at = new Date(conversation.lastReadAt).getTime();
    const pending = messages.filter(
      (m) => m.direction === "in" && new Date(m.createdAt).getTime() > at,
    );
    return {
      unreadBoundary: pending.length > 0 ? pending[0].id : null,
      unreadCount: pending.length,
    };
  }, [messages, conversation.lastReadAt]);

  return {
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
  };
}
