import { Injectable, BadRequestException, NotFoundException, Inject } from "@nestjs/common";
import { ChannelType, ScheduleMode, ScheduledPostStatus } from "@connectme/database";
import {
  FacebookPostClient,
  InstagramPostClient,
  TelegramPostClient,
  DiscordPostClient,
} from "@connectme/channels";
import { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";
import { IScheduledPostRepository } from "../../../domain/repositories/i-scheduled-post.repository";
import { SchedulingQueueService } from "../../../infrastructure/queue/scheduling-queue.service";

@Injectable()
export class CancelScheduledPostUseCase {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IScheduledPostRepository")
    private readonly repo: IScheduledPostRepository,
    private readonly schedulingQueue: SchedulingQueueService,
    private readonly facebookPostClient: FacebookPostClient,
    private readonly instagramPostClient: InstagramPostClient,
    private readonly telegramPostClient: TelegramPostClient,
    private readonly discordPostClient: DiscordPostClient,
  ) {}

  async execute(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundException("Scheduled post not found");

    if (row.status === ScheduledPostStatus.PUBLISHED) {
      throw new BadRequestException("A published post cannot be canceled.");
    }
    if (row.status === ScheduledPostStatus.CANCELED) {
      return row;
    }

    if (row.mode === ScheduleMode.NATIVE && row.platformPostId && row.accountId) {
      const account = await this.tenantRepo.findAccountById(tenantId, row.accountId);
      const credentials = await this.tenantRepo.getCredentials(tenantId);
      if (account) {
        const client =
          row.channel === ChannelType.MESSENGER
            ? this.facebookPostClient
            : row.channel === ChannelType.INSTAGRAM
              ? this.instagramPostClient
              : row.channel === ChannelType.TELEGRAM
                ? this.telegramPostClient
                : row.channel === ChannelType.DISCORD
                  ? this.discordPostClient
                  : null;
        if (client) {
          await client
            .cancel(
              {
                accountExternalId: account.externalId,
                credentials,
                accessTokenEnc: account.accessTokenEnc,
              },
              row.platformPostId,
            )
            .catch(() => undefined);
        }
      }
    }

    await this.schedulingQueue.remove(row.id);
    return this.repo.update(tenantId, row.id, { status: ScheduledPostStatus.CANCELED });
  }
}
