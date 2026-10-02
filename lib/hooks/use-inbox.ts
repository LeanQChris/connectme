"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationDetail,
  ConversationStatus,
  ConversationSummary,
  Message,
} from "@/lib/types";

export const QUERY_KEYS = {
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useConversations() {
  return useQuery({
    queryKey: QUERY_KEYS.conversations,
    queryFn: () =>
      fetchJson<{ conversations: ConversationSummary[] }>("/api/conversations").then(
        (data) => data.conversations,
      ),
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.conversation(id ?? ""),
    queryFn: () => fetchJson<ConversationDetail>(`/api/conversations/${id}`),
    enabled: Boolean(id),
    refetchInterval: 2500,
    staleTime: 2000,
  });
}

export function useSetConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ConversationStatus }) => {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data as { conversation: ConversationSummary | null };
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

export function useSendReply(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!conversationId) throw new Error("No conversation selected");
      const res = await fetch(`/api/conversations/${conversationId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send message");
      return data as { message: Message };
    },

    // When mutate is called:
    onMutate: async (text: string) => {
      if (!conversationId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversations });

      // Snapshot previous state
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
          type: "text",
          text,
          externalId: null,
          channel: previousDetail.conversation.channel,
          status: "sent",
          error: null,
          createdAt: now,
        };

        // Optimistically update active thread
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
        // Optimistically update conversation list preview
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

    onError: (err, _text, context) => {
      if (conversationId && context?.previousDetail) {
        // Mark message as failed instead of removing
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
              text: _text,
              externalId: null,
              channel: context.previousDetail.conversation.channel,
              status: "failed",
              error: errorMsg,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
    },

    onSettled: () => {
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });
}
