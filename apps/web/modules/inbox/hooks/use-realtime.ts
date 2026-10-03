"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { NotificationService } from "@/core/notifications/notification-service";
import { envConfig } from "@/core/config/env.config";
import { QUERY_KEYS } from "./use-inbox";

interface RealtimeMessage {
  direction?: string;
  channel?: string;
  type?: string;
  text?: string | null;
}

export function useRealtimeInbox(activeConversationId?: string | null) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      const socket = io(envConfig.socketUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        auth: { token },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join:tenant");
        if (activeConversationId) {
          socket.emit("join:conversation", { conversationId: activeConversationId });
        }
      });

      socket.on("message:new", ({ conversationId, message }: { conversationId: string; message?: RealtimeMessage }) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });

        // Trigger notification if message is inbound and app is not focused or user is on another conversation
        const isInbound = !message?.direction || message.direction === "in" || message.direction === "inbound";
        const isBackgrounded = typeof document !== "undefined" && (document.visibilityState === "hidden" || !document.hasFocus());
        const isDifferentThread = activeConversationId !== conversationId;

        if (isInbound && (isBackgrounded || isDifferentThread)) {
          const channelLabel = message?.channel
            ? message.channel.charAt(0).toUpperCase() + message.channel.slice(1)
            : "Customer";
          const snippet = message?.text || (message?.type && message.type !== "text" ? `Sent a ${message.type}` : "New message received");

          NotificationService.showNotification({
            title: `${channelLabel} — New Message`,
            body: snippet,
            conversationId,
            channel: message?.channel,
            playSound: true,
          });
        }
      });

      socket.on("conversation:update", () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      });

      socket.on("message:status", () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
        if (activeConversationId) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(activeConversationId) });
        }
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [activeConversationId, isLoaded, isSignedIn, getToken, queryClient]);
}
