import { httpClient } from "@/core/api/http-client";
import type {
  CreateScheduledMessageInput,
  CreateScheduledPostInput,
  PresignedUpload,
  ScheduledMessage,
  ScheduledMessageStatus,
  ScheduledPost,
  ScheduledPostStatus,
  UpdateScheduledPostInput,
} from "../data/scheduling.types";

export const schedulingApi = {
  listPosts: (params?: { status?: ScheduledPostStatus; accountId?: string; channel?: string }) =>
    httpClient<ScheduledPost[]>("/api/scheduled-posts", { params, cache: "no-store" }),

  createPost: (input: CreateScheduledPostInput) =>
    httpClient<ScheduledPost>("/api/scheduled-posts", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updatePost: (id: string, input: UpdateScheduledPostInput) =>
    httpClient<ScheduledPost>(`/api/scheduled-posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  cancelPost: (id: string) =>
    httpClient<ScheduledPost>(`/api/scheduled-posts/${id}`, { method: "DELETE" }),

  listMessages: (params?: {
    status?: ScheduledMessageStatus;
    conversationId?: string;
  }) =>
    httpClient<ScheduledMessage[]>("/api/scheduled-messages", { params, cache: "no-store" }),

  createMessage: (input: CreateScheduledMessageInput) =>
    httpClient<ScheduledMessage>("/api/scheduled-messages", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  cancelMessage: (id: string) =>
    httpClient<ScheduledMessage>(`/api/scheduled-messages/${id}`, { method: "DELETE" }),

  presignUpload: (filename: string, contentType?: string) =>
    httpClient<PresignedUpload>("/api/media/presign", {
      method: "POST",
      body: JSON.stringify({ filename, contentType }),
    }),

  uploadToStorage: async (file: File): Promise<PresignedUpload> => {
    const MAX_BYTES = 8 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new Error(`File is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)}MB).`);
    }
    const presigned = await schedulingApi.presignUpload(file.name, file.type);
    const res = await fetch(presigned.uploadUrl, {
      method: "PUT",
      body: file,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    });
    if (!res.ok) {
      throw new Error(`Upload failed with HTTP ${res.status}`);
    }
    return presigned;
  },
};