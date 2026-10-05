"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationDetail,
  ConversationStatus,
  ConversationSummary,
  Message,
  MessageType,
  SearchHit,
  SettingsPayload,
} from "@/lib/types";

export const QUERY_KEYS = {
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  settings: ["settings"] as const,
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: () => fetchJson<SettingsPayload>("/api/settings"),
    staleTime: 10000,
  });
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

export interface ConversationMetaPatch {
  assignee?: string | null;
  tags?: string[];
}

/** Assigns an owner and/or replaces the tag list. */
export function useSetConversationMeta(id: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ConversationMetaPatch) => {
      if (!id) throw new Error("No conversation selected");
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data as { conversation: ConversationSummary };
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
      const res = await fetch(`/api/conversations/${id}/note`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, author }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data as { message: Message; conversation: ConversationSummary };
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
    queryFn: () =>
      fetchJson<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(query)}`).then(
        (data) => data.hits,
      ),
    enabled: query.trim().length >= 2,
    staleTime: 5000,
  });
}

export interface ReplyPayload {
  text: string;
  mediaUrl?: string | null;
  mimeType?: string;
  type?: MessageType;
}

export function useSendReply(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReplyPayload) => {
      if (!conversationId) throw new Error("No conversation selected");
      const res = await fetch(`/api/conversations/${conversationId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send message");
      return data as { message: Message };
    },

    // When mutate is called:
    onMutate: async ({ text, mediaUrl = null, type = "text" }: ReplyPayload) => {
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
          type,
          text,
          mediaUrl,
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

    onError: (err, payload, context) => {
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
    },

    onSettled: () => {
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });
}

export function useSlackDirectory(enabled = true) {
  return useQuery({
    queryKey: ["slack-directory"] as const,
    queryFn: () => fetchJson<import("@/lib/slack/client").SlackDirectory>("/api/slack/directory"),
    enabled,
    staleTime: 60000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      channel: import("@/lib/types").Channel;
      contactExternalId: string;
      contactName?: string | null;
      avatarUrl?: string | null;
      accountId?: string | null;
      accountName?: string | null;
    }) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data as { conversation: ConversationSummary };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      if (data.conversation?.id) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.conversation(data.conversation.id),
        });
      }
    },
  });
}

