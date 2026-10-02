"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { envConfig } from "@/core/config/env.config";
import { schedulingApi } from "../api/scheduling.api";
import type {
  CreateScheduledMessageInput,
  CreateScheduledPostInput,
  ScheduledMessageStatus,
  ScheduledPostStatus,
  UpdateScheduledPostInput,
} from "../data/scheduling.types";

export const SCHEDULING_KEYS = {
  posts: (filter?: Record<string, unknown>) => ["scheduled-posts", filter ?? {}] as const,
  messages: (filter?: Record<string, unknown>) =>
    ["scheduled-messages", filter ?? {}] as const,
};

export function useScheduledPosts(filter?: {
  status?: ScheduledPostStatus;
  accountId?: string;
  channel?: string;
}) {
  return useQuery({
    queryKey: SCHEDULING_KEYS.posts(filter),
    queryFn: () => schedulingApi.listPosts(filter),
    refetchInterval: 20000,
    staleTime: 10000,
  });
}

export function useScheduledMessages(filter?: {
  status?: ScheduledMessageStatus;
  conversationId?: string;
}) {
  return useQuery({
    queryKey: SCHEDULING_KEYS.messages(filter),
    queryFn: () => schedulingApi.listMessages(filter),
    refetchInterval: 20000,
    staleTime: 10000,
  });
}

export function useCreateScheduledPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduledPostInput) => schedulingApi.createPost(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
  });
}

export function useUpdateScheduledPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateScheduledPostInput }) =>
      schedulingApi.updatePost(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
  });
}

export function useCancelScheduledPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulingApi.cancelPost(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
  });
}

export function useCreateScheduledMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduledMessageInput) => schedulingApi.createMessage(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
    },
  });
}

export function useCancelScheduledMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulingApi.cancelMessage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
    },
  });
}

export function useUploadPostMedia() {
  return useMutation({
    mutationFn: (file: File) => schedulingApi.uploadToStorage(file),
  });
}

/** Invalidates scheduled queries when the worker emits an update. */
export function useSchedulingRealtime(tenantId = "system") {
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
    });

    socket.on("scheduled:update", () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [tenantId, queryClient]);
}