import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
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
} from "@connectme/database";

// Repositories
import { TypeOrmTenantRepository } from "./infrastructure/database/repositories/typeorm-tenant.repository";
import { TypeOrmContactRepository } from "./infrastructure/database/repositories/typeorm-contact.repository";
import { TypeOrmConversationRepository } from "./infrastructure/database/repositories/typeorm-conversation.repository";
import { TypeOrmMessageRepository } from "./infrastructure/database/repositories/typeorm-message.repository";
import { TypeOrmScheduledPostRepository } from "./infrastructure/database/repositories/typeorm-scheduled-post.repository";
import { TypeOrmScheduledMessageRepository } from "./infrastructure/database/repositories/typeorm-scheduled-message.repository";

// Infrastructure Services
import { RedisService } from "./infrastructure/redis/redis.service";
import { IdempotencyLockService } from "./infrastructure/redis/idempotency-lock.service";
import {
  SchedulingQueueService,
  OUTBOUND_SCHEDULER_QUEUE,
} from "./infrastructure/queue/scheduling-queue.service";
import { S3PresignService } from "./infrastructure/storage/s3-presign.service";

// Channel Clients + Vault (shared package)
import {
  AesVaultService,
  WhatsAppClient,
  MessengerClient,
  InstagramClient,
  TelegramClient,
  DiscordClient,
  FacebookPostClient,
  InstagramPostClient,
} from "@connectme/channels";

// Gateways
import { InboxRealtimeGateway } from "./presentation/gateways/inbox-realtime.gateway";
import { RealtimeBridgeService } from "./infrastructure/realtime/realtime-bridge.service";

// Use cases
import { SendReplyUseCase } from "./application/use-cases/messages/send-reply.use-case";
import { AddInternalNoteUseCase } from "./application/use-cases/messages/add-internal-note.use-case";
import { ListConversationsUseCase } from "./application/use-cases/conversations/list-conversations.use-case";
import { GetConversationDetailUseCase } from "./application/use-cases/conversations/get-conversation-detail.use-case";
import { UpdateConversationUseCase } from "./application/use-cases/conversations/update-conversation.use-case";
import { ProcessInboundMetaUseCase } from "./application/use-cases/webhooks/process-inbound-meta.use-case";
import { ProcessInboundTelegramUseCase } from "./application/use-cases/webhooks/process-inbound-telegram.use-case";
import { ProcessInboundDiscordUseCase } from "./application/use-cases/webhooks/process-inbound-discord.use-case";
import { CreateScheduledPostUseCase } from "./application/use-cases/scheduling/create-scheduled-post.use-case";
import { CreateScheduledMessageUseCase } from "./application/use-cases/scheduling/create-scheduled-message.use-case";
import { ListScheduledPostsUseCase } from "./application/use-cases/scheduling/list-scheduled-posts.use-case";
import { ListScheduledMessagesUseCase } from "./application/use-cases/scheduling/list-scheduled-messages.use-case";
import { CancelScheduledPostUseCase } from "./application/use-cases/scheduling/cancel-scheduled-post.use-case";
import { CancelScheduledMessageUseCase } from "./application/use-cases/scheduling/cancel-scheduled-message.use-case";
import { UpdateScheduledPostUseCase } from "./application/use-cases/scheduling/update-scheduled-post.use-case";

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

import { SetupController } from "./presentation/controllers/setup.controller";

// Auth
import { ClerkAuthGuard } from "./presentation/auth/clerk-auth.guard";
import { ClerkTokenVerifier } from "./presentation/auth/clerk-token-verifier.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/connectme",
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
      ],
      synchronize: process.env.NODE_ENV !== "production",
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
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
    }),
    BullModule.registerQueue({ name: OUTBOUND_SCHEDULER_QUEUE }),
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

    // Infrastructure services
    RedisService,
    IdempotencyLockService,
    AesVaultService,
    SchedulingQueueService,
    S3PresignService,

    // Channel Drivers
    WhatsAppClient,
    MessengerClient,
    InstagramClient,
    TelegramClient,
    DiscordClient,
    FacebookPostClient,
    InstagramPostClient,

    // Realtime Gateway
    InboxRealtimeGateway,
    RealtimeBridgeService,

    // Application Use Cases
    SendReplyUseCase,
    AddInternalNoteUseCase,
    ListConversationsUseCase,
    GetConversationDetailUseCase,
    UpdateConversationUseCase,
    ProcessInboundMetaUseCase,
    ProcessInboundTelegramUseCase,
    ProcessInboundDiscordUseCase,
    CreateScheduledPostUseCase,
    CreateScheduledMessageUseCase,
    ListScheduledPostsUseCase,
    ListScheduledMessagesUseCase,
    CancelScheduledPostUseCase,
    CancelScheduledMessageUseCase,
    UpdateScheduledPostUseCase,
  ],
})
export class AppModule {}
