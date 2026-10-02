import type {
  Channel,
  ConversationSummary,
  ConversationDetail,
  Message,
  ReplyWindow,
  SearchHit,
  UploadedMedia,
  ConversationStatus,
} from "@/core/types";

export type ChannelFilter = Channel | "all";
export type StatusFilter = "all" | ConversationStatus;

export type {
  Channel,
  ConversationSummary,
  ConversationDetail,
  Message,
  ReplyWindow,
  SearchHit,
  UploadedMedia,
  ConversationStatus,
};
