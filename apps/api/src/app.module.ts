import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import {
  Tenant,
  User,
  TenantCredential,
  ConnectedAccount,
  Contact,
  Conversation,
  Message,
  ScheduledPost,
  ScheduledMessage,
  WhatsAppTemplate,
} from "@connectme/database";

// Repositories
import { TypeOrmTenantRepository } from "./infrastructure/database/repositories/typeorm-tenant.repository";
import { TypeOrmContactRepository } from "./infrastructure/database/repositories/typeorm-contact.repository";
import { TypeOrmConversationRepository } from "./infrastructure/database/repositories/typeorm-conversation.repository";
import { TypeOrmMessageRepository } from "./infrastructure/database/repositories/typeorm-message.repository";
import { TypeOrmScheduledPostRepository } from "./infrastructure/database/repositories/typeorm-scheduled-post.repository";
import { TypeOrmScheduledMessageRepository } from "./infrastructure/database/repositories/typeorm-scheduled-message.repository";
import { TypeOrmStatsRepository } from "./infrastructure/database/repositories/typeorm-stats.repository";

// Infrastructure Services
import { RedisModule } from "./infrastructure/redis/redis.module";
import { RedisThrottlerStorage } from "./infrastructure/redis/redis-throttler.storage";
import { RedisService } from "./infrastructure/redis/redis.service";
import { buildBullConnection } from "./infrastructure/redis/redis-options";
import {
  SchedulingQueueService,
  OUTBOUND_SCHEDULER_QUEUE,
} from "./infrastructure/queue/scheduling-queue.service";
import {
  INBOUND_WEBHOOKS_QUEUE,
  OUTBOUND_RETRY_QUEUE,
} from "./infrastructure/queue/queue.constants";
import { S3PresignService } from "./infrastructure/storage/s3-presign.service";

// Channel Clients + Vault (shared package)
import {
  AesVaultService,
  WhatsAppClient,
  MessengerClient,
  InstagramClient,
  TelegramClient,
  DiscordClient,
  SlackClient,
  FacebookPostClient,
  InstagramPostClient,
  TelegramPostClient,
  DiscordPostClient,
} from "@connectme/channels";

// Gateways
import { InboxRealtimeGateway } from "./presentation/gateways/inbox-realtime.gateway";
import { RealtimeBridgeService } from "./infrastructure/realtime/realtime-bridge.service";

// Link preview, AI & WhatsApp Templates
import { LinkPreviewService } from "./infrastructure/services/link-preview.service";
import { AiService } from "./infrastructure/services/ai.service";
import { WhatsAppTemplateService } from "./infrastructure/services/whatsapp-template.service";

// Use cases
import { SendReplyUseCase } from "./application/use-cases/messages/send-reply.use-case";
import { AddInternalNoteUseCase } from "./application/use-cases/messages/add-internal-note.use-case";
import { ListConversationsUseCase } from "./application/use-cases/conversations/list-conversations.use-case";
import { GetConversationDetailUseCase } from "./application/use-cases/conversations/get-conversation-detail.use-case";
import { UpdateConversationUseCase } from "./application/use-cases/conversations/update-conversation.use-case";
import { DeleteConversationUseCase } from "./application/use-cases/conversations/delete-conversation.use-case";
import { ProcessInboundSlackUseCase } from "./application/use-cases/webhooks/process-inbound-slack.use-case";
import { CreateScheduledPostUseCase } from "./application/use-cases/scheduling/create-scheduled-post.use-case";
import { CreateScheduledMessageUseCase } from "./application/use-cases/scheduling/create-scheduled-message.use-case";
import { ListScheduledPostsUseCase } from "./application/use-cases/scheduling/list-scheduled-posts.use-case";
import { ListScheduledMessagesUseCase } from "./application/use-cases/scheduling/list-scheduled-messages.use-case";
import { CancelScheduledPostUseCase } from "./application/use-cases/scheduling/cancel-scheduled-post.use-case";
import { CancelScheduledMessageUseCase } from "./application/use-cases/scheduling/cancel-scheduled-message.use-case";
import { UpdateScheduledPostUseCase } from "./application/use-cases/scheduling/update-scheduled-post.use-case";
import { GetDashboardStatsUseCase } from "./application/use-cases/stats/get-dashboard-stats.use-case";

// Controllers
import { WebhookController } from "./presentation/controllers/webhook.controller";
import { ConversationsController } from "./presentation/controllers/conversations.controller";
import { MessagesController } from "./presentation/controllers/messages.controller";
import { SettingsController } from "./presentation/controllers/settings.controller";
import { SearchController } from "./presentation/controllers/search.controller";
import { AuthMetaController } from "./presentation/controllers/auth-meta.controller";
import { MediaController } from "./presentation/controllers/media.controller";
import { ScheduledPostsController } from "./presentation/controllers/scheduled-posts.controller";
import { ScheduledMessagesController } from "./presentation/controllers/scheduled-messages.controller";
import { StatsController } from "./presentation/controllers/stats.controller";
import { LinkPreviewController } from "./presentation/controllers/link-preview.controller";
import { WidgetController } from "./presentation/controllers/widget.controller";
import { AiController } from "./presentation/controllers/ai.controller";
import { WhatsAppTemplateController } from "./presentation/controllers/whatsapp-template.controller";

import { SetupController } from "./presentation/controllers/setup.controller";

// Auth
import { ClerkAuthGuard } from "./presentation/auth/clerk-auth.guard";
import { ClerkTokenVerifier } from "./presentation/auth/clerk-token-verifier.service";
import { validateEnv, shouldSynchronize } from "./infrastructure/config/env.validation";
import { HealthController } from "./presentation/controllers/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [{ ttl: 60_000, limit: 120 }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5434/connectme",
      entities: [
        Tenant,
        User,
        TenantCredential,
        ConnectedAccount,
        Contact,
        Conversation,
        Message,
        ScheduledPost,
        ScheduledMessage,
        WhatsAppTemplate,
      ],
      synchronize: shouldSynchronize(),
      logging: false,
    }),
    TypeOrmModule.forFeature([
      Tenant,
      User,
      TenantCredential,
      ConnectedAccount,
      Contact,
      Conversation,
      Message,
      ScheduledPost,
      ScheduledMessage,
      WhatsAppTemplate,
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildBullConnection(
          config.get<string>("REDIS_URL"),
          config.get<string>("REDIS_HOST"),
          config.get<string>("REDIS_PORT"),
        ),
      }),
    }),
    BullModule.registerQueue({ name: OUTBOUND_SCHEDULER_QUEUE }),
    BullModule.registerQueue({ name: INBOUND_WEBHOOKS_QUEUE }),
    BullModule.registerQueue({ name: OUTBOUND_RETRY_QUEUE }),
  ],
  controllers: [
    WebhookController,
    ConversationsController,
    MessagesController,
    SettingsController,
    SearchController,
    AuthMetaController,
    MediaController,
    SetupController,
    ScheduledPostsController,
    ScheduledMessagesController,
    StatsController,
    HealthController,
    LinkPreviewController,
    WidgetController,
    AiController,
    WhatsAppTemplateController,
  ],
  providers: [
    // Global guards: rate limiting first, then authentication.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
    ClerkTokenVerifier,

    // Ports & Adapters DI
    { provide: "ITenantRepository", useClass: TypeOrmTenantRepository },
    { provide: "IContactRepository", useClass: TypeOrmContactRepository },
    { provide: "IConversationRepository", useClass: TypeOrmConversationRepository },
    { provide: "IMessageRepository", useClass: TypeOrmMessageRepository },
    { provide: "IScheduledPostRepository", useClass: TypeOrmScheduledPostRepository },
    { provide: "IScheduledMessageRepository", useClass: TypeOrmScheduledMessageRepository },
    { provide: "IStatsRepository", useClass: TypeOrmStatsRepository },

    // Infrastructure services (RedisService + IdempotencyLockService come from RedisModule)
    AesVaultService,
    SchedulingQueueService,
    S3PresignService,
    LinkPreviewService,
    AiService,
    WhatsAppTemplateService,

    // Channel Drivers
    WhatsAppClient,
    MessengerClient,
    InstagramClient,
    TelegramClient,
    DiscordClient,
    SlackClient,
    FacebookPostClient,
    InstagramPostClient,
    TelegramPostClient,
    DiscordPostClient,

    // Realtime Gateway
    InboxRealtimeGateway,
    RealtimeBridgeService,

    // Application Use Cases
    SendReplyUseCase,
    AddInternalNoteUseCase,
    ListConversationsUseCase,
    GetConversationDetailUseCase,
    UpdateConversationUseCase,
    DeleteConversationUseCase,
    ProcessInboundSlackUseCase,
    CreateScheduledPostUseCase,
    CreateScheduledMessageUseCase,
    ListScheduledPostsUseCase,
    ListScheduledMessagesUseCase,
    CancelScheduledPostUseCase,
    CancelScheduledMessageUseCase,
    UpdateScheduledPostUseCase,
    GetDashboardStatsUseCase,
  ],
})
export class AppModule {}
