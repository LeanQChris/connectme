"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { envConfig } from "@/core/config/env.config";
import { QUERY_KEYS } from "./use-inbox";

export function useRealtimeInbox(tenantId = "system", activeConversationId?: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(envConfig.socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:tenant", { tenantId });
      if (activeConversationId) {
        socket.emit("join:conversation", { conversationId: activeConversationId });
      }
    });

    socket.on("message:new", ({ conversationId }: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
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

    return () => {
      socket.disconnect();
    };
  }, [tenantId, activeConversationId, queryClient]);
}
