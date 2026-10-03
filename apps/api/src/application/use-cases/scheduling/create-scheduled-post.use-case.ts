import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { ChannelType, ScheduleMode, ScheduledPostStatus } from "@connectme/database";
import { CreateScheduledPostDto } from "@connectme/contracts";
import {
  FacebookPostClient,
  InstagramPostClient,
  TelegramPostClient,
  DiscordPostClient,
  PostPublishContext,
} from "@connectme/channels";
import { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";
import { IScheduledPostRepository } from "../../../domain/repositories/i-scheduled-post.repository";
import {
  SchedulingQueueService,
  ScheduledJobData,
} from "../../../infrastructure/queue/scheduling-queue.service";

const MIN_LEAD_MS = 60_000;
const FB_MIN_NATIVE_MS = 10 * 60_000;
const FB_MAX_NATIVE_MS = 75 * 24 * 60 * 60_000;

export interface CreateScheduledPostInput {
  tenantId: string;
  dto: CreateScheduledPostDto;
  createdBy?: string;
}

@Injectable()
export class CreateScheduledPostUseCase {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IScheduledPostRepository")
    private readonly scheduledRepo: IScheduledPostRepository,
    private readonly schedulingQueue: SchedulingQueueService,
    private readonly facebookPostClient: FacebookPostClient,
    private readonly instagramPostClient: InstagramPostClient,
    private readonly telegramPostClient: TelegramPostClient,
    private readonly discordPostClient: DiscordPostClient,
  ) {}

  async execute(input: CreateScheduledPostInput) {
    const { tenantId, dto } = input;

    const account = await this.tenantRepo.findAccountById(tenantId, dto.accountId);
    if (!account) {
      throw new BadRequestException("Connected account not found for this tenant.");
    }

    const channel = account.channel;
    const client =
      channel === ChannelType.MESSENGER
        ? this.facebookPostClient
        : channel === ChannelType.INSTAGRAM
          ? this.instagramPostClient
          : channel === ChannelType.TELEGRAM
            ? this.telegramPostClient
            : channel === ChannelType.DISCORD
              ? this.discordPostClient
              : null;

    if (!client) {
      throw new BadRequestException("Post scheduling is not supported for this channel.");
    }

    const fireAt = new Date(dto.scheduledFor);
    if (Number.isNaN(fireAt.getTime())) {
      throw new BadRequestException("Invalid scheduledFor date.");
    }
    if (fireAt.getTime() < Date.now() + MIN_LEAD_MS) {
      throw new BadRequestException("Scheduled time must be at least 1 minute in the future.");
    }
    if (client.nativeScheduling) {
      const delta = fireAt.getTime() - Date.now();
      if (delta < FB_MIN_NATIVE_MS || delta > FB_MAX_NATIVE_MS) {
        throw new BadRequestException(
          "Native Facebook scheduling requires a time between 10 minutes and 75 days from now.",
        );
      }
    }

    const credentials = await this.tenantRepo.getCredentials(tenantId);
    const mode = client.nativeScheduling ? ScheduleMode.NATIVE : ScheduleMode.LOCAL;

    const row = await this.scheduledRepo.create({
      tenantId,
      accountId: account.id,
      channel,
      kind: (dto.kind || "text").toUpperCase(),
      caption: dto.caption ?? null,
      mediaUrls: dto.mediaUrls ?? [],
      scheduledFor: fireAt,
      mode,
      status: ScheduledPostStatus.PENDING,
      createdBy: input.createdBy ?? dto.createdBy ?? null,
    });

    const ctx: PostPublishContext = {
      accountExternalId: account.externalId,
      credentials,
      accessTokenEnc: account.accessTokenEnc,
      caption: dto.caption,
      mediaUrls: dto.mediaUrls ?? [],
      kind: (dto.kind || "text").toUpperCase(),
      scheduledFor: fireAt,
      timezone: dto.timezone,
    };

    if (client.nativeScheduling) {
      try {
        const result = await client.schedule(ctx);
        await this.scheduledRepo.update(tenantId, row.id, {
          status: ScheduledPostStatus.SCHEDULED,
          platformPostId: result.platformPostId,
          attempts: row.attempts + 1,
        });
        row.status = ScheduledPostStatus.SCHEDULED;
        row.platformPostId = result.platformPostId;
      } catch (err: any) {
        await this.scheduledRepo.update(tenantId, row.id, {
          status: ScheduledPostStatus.FAILED,
          lastError: err?.message || "Native scheduling failed",
        });
        throw new BadRequestException(err?.message || "Native scheduling failed");
      }
    }

    const jobData: ScheduledJobData = { kind: "post", id: row.id, tenantId };
    const verifyAt = client.nativeScheduling
      ? new Date(fireAt.getTime() + 120_000)
      : fireAt;
    await this.schedulingQueue.enqueue(jobData, verifyAt);

    return this.scheduledRepo.findById(tenantId, row.id);
  }
}
