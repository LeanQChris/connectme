import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
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
import { WebhookInboundProcessor } from "./processors/webhook-inbound.processor";
import { OutboundSchedulerProcessor } from "./processors/outbound-scheduler.processor";
import { AiAgentProcessor } from "./processors/ai-agent.processor";
import { MediaRehostProcessor } from "./processors/media-rehost.processor";
import { OutboundRetryProcessor } from "./processors/outbound-retry.processor";
import { AiAgentService } from "./services/ai-agent.service";
import { S3MediaService } from "./storage/s3-media.service";
import { WorkerHealthService } from "./health/health-server";
import {
  AI_AGENT_QUEUE,
  INBOUND_WEBHOOKS_QUEUE,
  MEDIA_REHOST_QUEUE,
  OUTBOUND_RETRY_QUEUE,
  OUTBOUND_SCHEDULER_QUEUE,
} from "./queue.constants";
import { RealtimePublisher } from "./realtime/realtime-publisher";
import { buildBullConnection } from "./redis/redis-options";
import { validateEnv } from "./env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
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
      ],
      synchronize: false,
      logging: false,
    }),
    TypeOrmModule.forFeature([
      TenantCredential,
      ConnectedAccount,
      Contact,
      Conversation,
      Message,
      ScheduledPost,
      ScheduledMessage,
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
    BullModule.registerQueue({ name: INBOUND_WEBHOOKS_QUEUE }),
    BullModule.registerQueue({ name: OUTBOUND_SCHEDULER_QUEUE }),
    BullModule.registerQueue({ name: AI_AGENT_QUEUE }),
    BullModule.registerQueue({ name: MEDIA_REHOST_QUEUE }),
    BullModule.registerQueue({ name: OUTBOUND_RETRY_QUEUE }),
  ],
  providers: [
    // Infrastructure
    AesVaultService,
    RealtimePublisher,
    S3MediaService,
    WorkerHealthService,

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

    // Processors
    WebhookInboundProcessor,
    OutboundSchedulerProcessor,
    AiAgentProcessor,
    MediaRehostProcessor,
    OutboundRetryProcessor,
    AiAgentService,
  ],
})
export class WorkerModule {}
