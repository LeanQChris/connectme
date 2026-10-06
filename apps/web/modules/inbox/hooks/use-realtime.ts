"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { NotificationService } from "@/core/notifications/notification-service";
import { envConfig } from "@/core/config/env.config";
import { QUERY_KEYS } from "./use-inbox";
import type { ConversationDetail, Message, MessageType } from "@/core/types";

interface RealtimeMessage {
  id?: string;
  direction?: string;
  channel?: string;
  type?: string;
  text?: string | null;
  media?: Message["media"] | null;
  externalId?: string | null;
  status?: string;
  createdAt?: string;
}

function toCachedMessage(
  conversationId: string,
  message: RealtimeMessage,
  fallbackChannel: Message["channel"],
): Message {
  return {
    id: message.id ?? `rt-${Date.now()}`,
    conversationId,
    direction:
      message.direction === "out" || message.direction === "outbound"
        ? "out"
        : message.direction === "note"
          ? "note"
          : "in",
    type: (message.type?.toLowerCase() as MessageType) || "text",
    text: message.text ?? null,
    media: message.media ?? null,
    externalId: message.externalId ?? null,
    channel: (message.channel?.toLowerCase() as Message["channel"]) || fallbackChannel,
    status: (message.status?.toLowerCase() as Message["status"]) || "received",
    error: null,
    createdAt: message.createdAt || new Date().toISOString(),
  };
}

const SOUND_STORAGE_KEY = "connectme_sound_enabled";

function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_STORAGE_KEY) !== "false";
}

export function useRealtimeInbox(activeConversationId?: string | null) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string | null | undefined>(activeConversationId);

  useEffect(() => {
    activeRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(envConfig.socketUrl, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelayMax: 10_000,
        auth: { token },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket?.emit("join:tenant");
        if (activeRef.current) {
          socket?.emit("join:conversation", { conversationId: activeRef.current });
        }
      });

      socket.io.on("reconnect_attempt", async () => {
        try {
          const fresh = await getToken();
          if (fresh && socket) socket.auth = { token: fresh };
        } catch {
          /* ignore token refresh failure; next attempt retries */
        }
      });

      socket.on(
        "message:new",
        ({ conversationId, message }: { conversationId: string; message?: RealtimeMessage & { id?: string; createdAt?: string; status?: string } }) => {
          // Apply the delta directly to the cached thread instead of refetching,
          // so an incoming message does not trigger a full network round-trip.
          if (message?.id) {
            queryClient.setQueryData<ConversationDetail>(
              QUERY_KEYS.conversation(conversationId),
              (prev) => {
                if (!prev) return prev;
                if (prev.messages.some((m) => m.id === message.id)) return prev;
                const mapped = toCachedMessage(conversationId, message, prev.conversation.channel);
                return {
                  ...prev,
                  conversation: {
                    ...prev.conversation,
                    lastMessage: mapped.text,
                    lastMessageAt: mapped.createdAt,
                  },
                  messages: [...prev.messages, mapped],
                };
              },
            );
          }
          // The list summary still gets a lightweight refetch to stay ordered.
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });

          const isInbound =
            !message?.direction || message.direction === "in" || message.direction === "inbound";
          const isBackgrounded =
            typeof document !== "undefined" &&
            (document.visibilityState === "hidden" || !document.hasFocus());
          const isDifferentThread = activeRef.current !== conversationId;

          if (isInbound && (isBackgrounded || isDifferentThread)) {
            const channelLabel = message?.channel
              ? message.channel.charAt(0).toUpperCase() + message.channel.slice(1)
              : "Customer";
            const snippet =
              message?.text ||
              (message?.type && message.type !== "text"
                ? `Sent a ${message.type}`
                : "New message received");

            NotificationService.showNotification({
              title: `${channelLabel} — New Message`,
              body: snippet,
              conversationId,
              channel: message?.channel,
              playSound: soundEnabled(),
            });
          }
        },
      );

      socket.on("conversation:update", () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      });

      socket.on("message:status", () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
        if (activeRef.current) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(activeRef.current) });
        }
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [isLoaded, isSignedIn, getToken, queryClient]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConversationId) return;
    socket.emit("join:conversation", { conversationId: activeConversationId });
  }, [activeConversationId]);
}
