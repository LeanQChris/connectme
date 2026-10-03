"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationDetail,
  ConversationStatus,
  ConversationSummary,
  Message,
} from "@/core/types";
import { inboxApi, type ReplyPayload, type ConversationMetaPatch } from "../api/inbox.api";
import { schedulingApi } from "@/modules/scheduling/api/scheduling.api";

export const QUERY_KEYS = {
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  settings: ["settings"] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: () => inboxApi.getSettings(),
    staleTime: 10000,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: QUERY_KEYS.conversations,
    queryFn: () => inboxApi.getConversations(),
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.conversation(id ?? ""),
    queryFn: () => inboxApi.getConversationDetail(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useSetConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ConversationStatus }) => {
      return inboxApi.updateConversation(id, { status });
    },
    onSuccess: (_data, { id, status }) => {
      queryClient.setQueryData<ConversationDetail>(QUERY_KEYS.conversation(id), (prev) =>
        prev
          ? {
              ...prev,
              conversation: {
                ...prev.conversation,
                status,
                unreadCount: status === "closed" ? 0 : prev.conversation.unreadCount,
              },
            }
          : prev,
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });
}

/** Assigns an owner and/or replaces the tag list. */
export function useSetConversationMeta(id: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ConversationMetaPatch) => {
      if (!id) throw new Error("No conversation selected");
      return inboxApi.updateConversation(id, patch);
    },
    onMutate: (patch) => {
      if (!id) return;
      const previous = queryClient.getQueryData<ConversationDetail>(QUERY_KEYS.conversation(id));
      const optimistic: ConversationSummary | null = previous
        ? {
            ...previous.conversation,
            assignee: patch.assignee !== undefined ? patch.assignee : previous.conversation.assignee,
            tags: patch.tags ?? previous.conversation.tags,
          }
        : null;

      if (optimistic) {
        queryClient.setQueryData<ConversationDetail>(QUERY_KEYS.conversation(id), {
          conversation: optimistic,
          messages: previous?.messages ?? [],
        });
        queryClient.setQueryData<ConversationSummary[]>(QUERY_KEYS.conversations, (list) =>
          list?.map((c) => (c.id === id ? { ...c, ...optimistic } : c)),
        );
      }
      return { previous, optimistic };
    },
    onError: (_error, _patch, context) => {
      if (!id || !context?.previous) return;
      queryClient.setQueryData(QUERY_KEYS.conversation(id), context.previous);
    },
    onSettled: () => {
      if (id) void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(id) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });
}

/** Appends an internal note, never sent to the customer. */
export function useAddNote(id: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text, author }: { text: string; author?: string }) => {
      if (!id) throw new Error("No conversation selected");
      return inboxApi.addNote(id, { text, author });
    },
    onSuccess: (data) => {
      if (!id) return;
      queryClient.setQueryData<ConversationDetail>(QUERY_KEYS.conversation(id), (prev) =>
        prev ? { ...prev, messages: [...prev.messages, data.message] } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });
}

/** Server-side full-text message search. */
export function useMessageSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => inboxApi.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 5000,
  });
}

/** Queues a reply for future delivery instead of sending it now. */
export function useScheduleMessage(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      scheduledFor,
    }: {
      payload: ReplyPayload;
      scheduledFor: string;
    }) => {
      if (!conversationId) throw new Error("No conversation selected");
      return schedulingApi.createMessage({
        conversationId,
        text: payload.text || undefined,
        mediaUrl: payload.mediaUrl ?? undefined,
        mediaType: payload.type,
        scheduledFor,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
    },
  });
}

export function useSendReply(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReplyPayload) => {
      if (!conversationId) throw new Error("No conversation selected");
      return inboxApi.sendReply(conversationId, payload);
    },
    onMutate: async ({ text, mediaUrl = null, type = "text" }: ReplyPayload) => {
      if (!conversationId) return;

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversations });

      const previousDetail = queryClient.getQueryData<ConversationDetail>(
        QUERY_KEYS.conversation(conversationId),
      );
      const previousList = queryClient.getQueryData<ConversationSummary[]>(
        QUERY_KEYS.conversations,
      );

      const optimisticId = `temp-${Date.now()}`;
      const now = new Date().toISOString();

      if (previousDetail) {
        const optimisticMessage: Message = {
          id: optimisticId,
          conversationId,
          direction: "out",
          type,
          text,
          mediaUrl,
          externalId: null,
          channel: previousDetail.conversation.channel,
          status: "sent",
          error: null,
          createdAt: now,
        };

        queryClient.setQueryData<ConversationDetail>(QUERY_KEYS.conversation(conversationId), {
          ...previousDetail,
          conversation: {
            ...previousDetail.conversation,
            lastMessage: text,
            lastMessageAt: now,
          },
          messages: [...previousDetail.messages, optimisticMessage],
        });
      }

      if (previousList) {
        queryClient.setQueryData<ConversationSummary[]>(
          QUERY_KEYS.conversations,
          previousList.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: text,
                  lastMessageAt: now,
                }
              : conv,
          ),
        );
      }

      return { previousDetail, previousList, optimisticId };
    },
    onError: (err, payload, context) => {
      if (conversationId && context?.previousDetail) {
        const errorMsg = err instanceof Error ? err.message : "Failed to deliver";
        queryClient.setQueryData<ConversationDetail>(QUERY_KEYS.conversation(conversationId), {
          ...context.previousDetail,
          messages: [
            ...context.previousDetail.messages,
            {
              id: context.optimisticId,
              conversationId,
              direction: "out",
              type: "text",
              text: payload.text,
              externalId: null,
              channel: context.previousDetail.conversation.channel,
              status: "failed",
              error: errorMsg,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      if (context?.previousList) {
        queryClient.setQueryData<ConversationSummary[]>(
          QUERY_KEYS.conversations,
          context.previousList,
        );
      }
    },
    onSuccess: () => {
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });
}
