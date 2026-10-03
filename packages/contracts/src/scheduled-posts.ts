import { z } from "zod";
import { Channel, ChannelSchema } from "./channels";

export const SCHEDULE_MODES = ["native", "local"] as const;
export type ScheduleMode = (typeof SCHEDULE_MODES)[number];
export const ScheduleModeSchema = z.enum(SCHEDULE_MODES);

export const SCHEDULED_POST_STATUSES = [
  "pending",
  "scheduled",
  "published",
  "failed",
  "canceled",
] as const;
export type ScheduledPostStatus = (typeof SCHEDULED_POST_STATUSES)[number];
export const ScheduledPostStatusSchema = z.enum(SCHEDULED_POST_STATUSES);

export const SCHEDULED_POST_KINDS = [
  "text",
  "image",
  "video",
  "reel",
  "carousel",
] as const;
export type ScheduledPostKind = (typeof SCHEDULED_POST_KINDS)[number];
export const ScheduledPostKindSchema = z.enum(SCHEDULED_POST_KINDS);

export interface ScheduledPostDto {
  id: string;
  tenantId: string;
  accountId: string | null;
  channel: Channel;
  kind: ScheduledPostKind;
  caption: string | null;
  mediaUrls: string[];
  scheduledFor: string;
  status: ScheduledPostStatus;
  mode: ScheduleMode;
  platformPostId: string | null;
  externalUrl: string | null;
  attempts: number;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ScheduledPostDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  accountId: z.string().nullable(),
  channel: ChannelSchema,
  kind: ScheduledPostKindSchema,
  caption: z.string().nullable(),
  mediaUrls: z.array(z.string()),
  scheduledFor: z.string(),
  status: ScheduledPostStatusSchema,
  mode: ScheduleModeSchema,
  platformPostId: z.string().nullable(),
  externalUrl: z.string().nullable(),
  attempts: z.number(),
  lastError: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export interface CreateScheduledPostDto {
  accountId: string;
  channel?: Channel;
  kind?: ScheduledPostKind;
  caption?: string;
  mediaUrls?: string[];
  scheduledFor: string;
  timezone?: string;
  createdBy?: string;
}

const MEDIA_URLS_SCHEMA = z.array(z.string().max(2048)).max(10);

export const CreateScheduledPostDtoSchema = z
  .object({
    accountId: z.string().min(1),
    channel: ChannelSchema.optional(),
    kind: ScheduledPostKindSchema.optional(),
    caption: z.string().max(2200).optional(),
    mediaUrls: MEDIA_URLS_SCHEMA.optional(),
    scheduledFor: z.string().datetime({ offset: true }),
    timezone: z.string().max(64).optional(),
    createdBy: z.string().max(128).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const mediaCount = value.mediaUrls?.length ?? 0;
    if (value.kind === "carousel" && mediaCount < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "A carousel requires at least 2 media items.",
      });
    }
    if (value.kind === "carousel" && mediaCount > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "A carousel supports at most 10 media items.",
      });
    }
    if (
      (value.kind === "image" || value.kind === "video" || value.kind === "reel") &&
      mediaCount < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: `${value.kind} posts require at least one media item.`,
      });
    }
  });

export interface UpdateScheduledPostDto {
  caption?: string;
  mediaUrls?: string[];
  scheduledFor?: string;
  timezone?: string;
}

export const UpdateScheduledPostDtoSchema = z
  .object({
    caption: z.string().max(2200).optional(),
    mediaUrls: z.array(z.string().max(2048)).max(10).optional(),
    scheduledFor: z.string().datetime({ offset: true }).optional(),
    timezone: z.string().max(64).optional(),
  })
  .strict();
