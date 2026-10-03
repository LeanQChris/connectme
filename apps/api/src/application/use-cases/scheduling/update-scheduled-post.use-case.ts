import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from "@nestjs/common";
import { ChannelType, ScheduleMode, ScheduledPostStatus } from "@connectme/database";
import { UpdateScheduledPostDto } from "@connectme/contracts";
import { FacebookPostClient, InstagramPostClient, PostPublishContext } from "@connectme/channels";
import { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";
import { IScheduledPostRepository } from "../../../domain/repositories/i-scheduled-post.repository";
import {
  SchedulingQueueService,
  ScheduledJobData,
} from "../../../infrastructure/queue/scheduling-queue.service";

const MIN_LEAD_MS = 60_000;
const FB_MIN_NATIVE_MS = 10 * 60_000;
const FB_MAX_NATIVE_MS = 75 * 24 * 60 * 60_000;

export interface UpdateScheduledPostInput {
  tenantId: string;
  id: string;
  dto: UpdateScheduledPostDto;
}

@Injectable()
export class UpdateScheduledPostUseCase {
  private readonly logger = new Logger(UpdateScheduledPostUseCase.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IScheduledPostRepository")
    private readonly repo: IScheduledPostRepository,
    private readonly schedulingQueue: SchedulingQueueService,
    private readonly facebookPostClient: FacebookPostClient,
    private readonly instagramPostClient: InstagramPostClient,
  ) {}

  async execute(input: UpdateScheduledPostInput) {
    const { tenantId, id, dto } = input;

    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundException("Scheduled post not found");
    if (
      row.status === ScheduledPostStatus.PUBLISHED ||
      row.status === ScheduledPostStatus.CANCELED
    ) {
      throw new BadRequestException("Only pending, scheduled, or failed posts can be edited.");
    }

    const client =
      row.channel === ChannelType.MESSENGER
        ? this.facebookPostClient
        : row.channel === ChannelType.INSTAGRAM
          ? this.instagramPostClient
          : null;
    if (!client) {
      throw new BadRequestException("Post scheduling is only supported for Facebook Pages and Instagram.");
    }

    const fireAt = dto.scheduledFor ? new Date(dto.scheduledFor) : row.scheduledFor;
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

    const account = row.accountId
      ? await this.tenantRepo.findAccountById(tenantId, row.accountId)
      : null;
    if (!account) throw new BadRequestException("Connected account not found for this tenant.");
    const credentials = await this.tenantRepo.getCredentials(tenantId);

    const caption = dto.caption !== undefined ? dto.caption : row.caption;
    const mediaUrls = dto.mediaUrls !== undefined ? dto.mediaUrls : row.mediaUrls;

    // Drop the old queued job before re-enqueueing.
    await this.schedulingQueue.remove(row.id);

    // Cancel the previously submitted native post, if any.
    if (row.mode === ScheduleMode.NATIVE && row.platformPostId) {
      await client
        .cancel(
          {
            accountExternalId: account.externalId,
            credentials,
            accessTokenEnc: account.accessTokenEnc,
          },
          row.platformPostId,
        )
        .catch((err) => {
          // Best-effort: the old native post may already be gone. Log so the
          // reason is visible, but do not block rescheduling.
          this.logger.warn(
            `Could not cancel previous native post ${row.platformPostId}: ${(err as Error)?.message}`,
          );
        });
    }

    const ctx: PostPublishContext = {
      accountExternalId: account.externalId,
      credentials,
      accessTokenEnc: account.accessTokenEnc,
      caption: caption ?? undefined,
      mediaUrls: mediaUrls ?? [],
      kind: row.kind,
      scheduledFor: fireAt,
    };

    if (client.nativeScheduling) {
      try {
        const result = await client.schedule(ctx);
        await this.repo.update(row.id, {
          caption: caption ?? null,
          mediaUrls: mediaUrls ?? [],
          scheduledFor: fireAt,
          status: ScheduledPostStatus.SCHEDULED,
          platformPostId: result.platformPostId,
          lastError: null,
        });
      } catch (err: any) {
        await this.repo.update(row.id, {
          status: ScheduledPostStatus.FAILED,
          lastError: err?.message || "Native rescheduling failed",
        });
        throw new BadRequestException(err?.message || "Native rescheduling failed");
      }
    } else {
      await this.repo.update(row.id, {
        caption: caption ?? null,
        mediaUrls: mediaUrls ?? [],
        scheduledFor: fireAt,
        status: ScheduledPostStatus.PENDING,
        lastError: null,
      });
    }

    const jobData: ScheduledJobData = { kind: "post", id: row.id, tenantId };
    const verifyAt = client.nativeScheduling
      ? new Date(fireAt.getTime() + 120_000)
      : fireAt;
    await this.schedulingQueue.enqueue(jobData, verifyAt);

    return this.repo.findById(tenantId, row.id);
  }
}
