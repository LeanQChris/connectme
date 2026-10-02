import { ScheduledPost, ScheduledMessage } from "@connectme/database";
import { ScheduledPostDto, ScheduledMessageDto } from "@connectme/contracts";

export function toScheduledPostDto(row: ScheduledPost): ScheduledPostDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    accountId: row.accountId ?? null,
    channel: row.channel.toLowerCase() as ScheduledPostDto["channel"],
    kind: row.kind.toLowerCase() as ScheduledPostDto["kind"],
    caption: row.caption ?? null,
    mediaUrls: row.mediaUrls ?? [],
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status.toLowerCase() as ScheduledPostDto["status"],
    mode: row.mode.toLowerCase() as ScheduledPostDto["mode"],
    platformPostId: row.platformPostId ?? null,
    externalUrl: row.externalUrl ?? null,
    attempts: row.attempts,
    lastError: row.lastError ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toScheduledMessageDto(row: ScheduledMessage): ScheduledMessageDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    conversationId: row.conversationId,
    channel: row.channel.toLowerCase() as ScheduledMessageDto["channel"],
    text: row.text ?? null,
    mediaUrl: row.mediaUrl ?? null,
    mediaType: (row.mediaType?.toLowerCase() as ScheduledMessageDto["mediaType"]) ?? null,
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status.toLowerCase() as ScheduledMessageDto["status"],
    attempts: row.attempts,
    lastError: row.lastError ?? null,
    externalId: row.externalId ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}