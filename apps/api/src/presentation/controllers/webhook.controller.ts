import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Param,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
  Inject,
} from "@nestjs/common";
import { verifyHmacSha256 } from "@connectme/crypto";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { ProcessInboundMetaUseCase } from "../../application/use-cases/webhooks/process-inbound-meta.use-case";
import { ProcessInboundTelegramUseCase } from "../../application/use-cases/webhooks/process-inbound-telegram.use-case";
import { ProcessInboundDiscordUseCase } from "../../application/use-cases/webhooks/process-inbound-discord.use-case";
import { MetaWebhookPayload, TelegramWebhookUpdate, DiscordInteractionPayload } from "@connectme/contracts";

@Controller("api/webhook")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly processMeta: ProcessInboundMetaUseCase,
    private readonly processTelegram: ProcessInboundTelegramUseCase,
    private readonly processDiscord: ProcessInboundDiscordUseCase,
  ) {}

  /**
   * Meta Hub Challenge verification for WhatsApp / Messenger / Instagram
   */
  @Get(["meta", ""])
  verifyMetaWebhook(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") verifyToken: string,
    @Query("hub.challenge") challenge: string,
  ): string {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "connectme_verify_token";
    if (mode === "subscribe" && (verifyToken === expectedToken || !expectedToken)) {
      this.logger.log("Meta webhook verification challenge succeeded.");
      return challenge;
    }
    throw new ForbiddenException("Invalid verification token");
  }

  /**
   * High-throughput Meta webhook receiver (< 50ms fast 200 response)
   */
  @Post(["meta", ""])
  @HttpCode(HttpStatus.OK)
  async handleMetaWebhook(
    @Body() payload: MetaWebhookPayload,
    @Headers("x-hub-signature-256") signature: string,
  ) {
    const metaAppSecret = process.env.META_APP_SECRET;
    if (metaAppSecret && signature) {
      const rawBody = JSON.stringify(payload);
      const valid = verifyHmacSha256(rawBody, metaAppSecret, signature);
      if (!valid) {
        this.logger.warn("Meta webhook signature verification failed; processing with caution in development.");
      }
    }

    // Process asynchronously to ensure <50ms return
    this.processMeta.execute(payload).catch((err) => {
      this.logger.error(`Error processing inbound Meta webhook: ${err.message}`, err.stack);
    });

    return { status: "EVENT_RECEIVED" };
  }

  /**
   * Telegram Bot Webhook endpoint
   */
  @Post("telegram/:botId")
  @HttpCode(HttpStatus.OK)
  async handleTelegramWebhook(
    @Param("botId") botId: string,
    @Body() update: TelegramWebhookUpdate,
  ) {
    this.processTelegram.execute(botId, update).catch((err) => {
      this.logger.error(`Error processing inbound Telegram webhook: ${err.message}`, err.stack);
    });

    return { ok: true };
  }

  /**
   * Discord interaction webhook
   */
  @Post("discord")
  @HttpCode(HttpStatus.OK)
  async handleDiscordWebhook(@Body() interaction: DiscordInteractionPayload) {
    // Discord PING check (type 1)
    if (interaction?.type === 1) {
      return { type: 1 };
    }

    this.processDiscord.execute(interaction).catch((err) => {
      this.logger.error(`Error processing inbound Discord webhook: ${err.message}`, err.stack);
    });

    return { type: 4, data: { content: "Received" } };
  }
}
