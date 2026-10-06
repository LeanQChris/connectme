import { httpClient } from "@/core/api/http-client";
import type {
  ConversationSummary,
  ConversationDetail,
  Message,
  MessageType,
  SearchHit,
  ConversationStatus,
  SettingsPayload,
} from "@/core/types";

export interface ReplyMediaInput {
  url: string;
  type: MessageType;
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
}

export interface ReplyPayload {
  text: string;
  /** Attachments to send; mediaUrl was retired in favour of this array. */
  media?: ReplyMediaInput[];
  mimeType?: string;
  type?: MessageType;
}

export interface ReplyResult {
  message: Message;
  /** Attachment kinds the channel refused (e.g. Instagram rejects video and files). */
  skipped?: string[];
}

export interface ConversationMetaPatch {
  assignee?: string | null;
  tags?: string[];
  status?: ConversationStatus;
}

export const inboxApi = {
  getSettings: () => {
    return httpClient<SettingsPayload>("/api/settings", { cache: "no-store" });
  },

  getConversations: (params?: { channel?: string; status?: string; tag?: string }) => {
    return httpClient<{ conversations: ConversationSummary[] }>("/api/conversations", {
      params,
      cache: "no-store",
    }).then((res) => res.conversations);
  },

  getConversationDetail: (id: string) => {
    return httpClient<ConversationDetail>(`/api/conversations/${id}`, { cache: "no-store" });
  },

  updateConversation: (id: string, patch: ConversationMetaPatch) => {
    return httpClient<{ conversation: ConversationSummary }>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  addNote: (id: string, payload: { text: string; author?: string }) => {
    return httpClient<{ message: Message; conversation: ConversationSummary }>(
      `/api/conversations/${id}/note`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  sendReply: (conversationId: string, payload: ReplyPayload) => {
    return httpClient<ReplyResult>(`/api/conversations/${conversationId}/reply`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  search: (query: string) => {
    return httpClient<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    }).then((res) => res.hits);
  },

  uploadMedia: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return httpClient<{
      url: string;
      mimeType: string;
      type: MessageType;
      size: number;
    }>("/api/media", {
      method: "POST",
      body: form,
    });
  },

  deleteConversation: (id: string) => {
    return httpClient<{ success: boolean; id: string }>(`/api/conversations/${id}`, {
      method: "DELETE",
    });
  },
};

