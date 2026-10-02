import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
} from "@connectme/channels";
import { WebhookInboundProcessor } from "./processors/webhook-inbound.processor";
import { OutboundSchedulerProcessor } from "./processors/outbound-scheduler.processor";
import { OUTBOUND_SCHEDULER_QUEUE } from "./queue.constants";
import { RealtimePublisher } from "./realtime/realtime-publisher";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
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
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
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

    // Processors
    WebhookInboundProcessor,
    OutboundSchedulerProcessor,
  ],
})
export class WorkerModule {}
