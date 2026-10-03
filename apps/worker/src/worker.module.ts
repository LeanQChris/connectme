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
  FacebookPostClient,
  InstagramPostClient,
  TelegramPostClient,
  DiscordPostClient,
} from "@connectme/channels";
import { WebhookInboundProcessor } from "./processors/webhook-inbound.processor";
import { OutboundSchedulerProcessor } from "./processors/outbound-scheduler.processor";
import { OUTBOUND_SCHEDULER_QUEUE } from "./queue.constants";
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
    BullModule.registerQueue({ name: "inbound-webhooks" }),
    BullModule.registerQueue({ name: OUTBOUND_SCHEDULER_QUEUE }),
  ],
  providers: [
    // Infrastructure
    AesVaultService,
    RealtimePublisher,

    // Channel Drivers
    WhatsAppClient,
    MessengerClient,
    InstagramClient,
    TelegramClient,
    DiscordClient,
    FacebookPostClient,
    InstagramPostClient,
    TelegramPostClient,
    DiscordPostClient,

    // Processors
    WebhookInboundProcessor,
    OutboundSchedulerProcessor,
  ],
})
export class WorkerModule {}
