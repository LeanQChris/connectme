import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
  Inject,
  RawBodyRequest,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { verifyHmacSha256, verifyDiscordSignature } from "@connectme/crypto";
import { ChannelType } from "@connectme/database";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { ProcessInboundMetaUseCase } from "../../application/use-cases/webhooks/process-inbound-meta.use-case";
import { ProcessInboundTelegramUseCase } from "../../application/use-cases/webhooks/process-inbound-telegram.use-case";
import { ProcessInboundDiscordUseCase } from "../../application/use-cases/webhooks/process-inbound-discord.use-case";
import { MetaWebhookPayload, TelegramWebhookUpdate, DiscordInteractionPayload } from "@connectme/contracts";
import { Public } from "../auth/public.decorator";

@Public()
@SkipThrottle()
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
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (!expectedToken) {
      throw new ForbiddenException("META_WEBHOOK_VERIFY_TOKEN is not configured");
    }
    if (mode === "subscribe" && verifyToken === expectedToken) {
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
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: MetaWebhookPayload,
    @Headers("x-hub-signature-256") signature: string,
  ) {
    const metaAppSecret = process.env.META_APP_SECRET;
    if (!metaAppSecret) {
      throw new ForbiddenException("META_APP_SECRET is not configured");
    }
    if (!signature || !verifyHmacSha256(req.rawBody ?? "", metaAppSecret, signature)) {
      this.logger.warn("Rejected Meta webhook with missing or invalid signature.");
      throw new ForbiddenException("Invalid webhook signature");
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
    @Headers("x-telegram-bot-api-secret-token") secretHeader: string,
    @Body() update: TelegramWebhookUpdate,
  ) {
    const account = await this.tenantRepo.findAccountByExternalId(ChannelType.TELEGRAM, botId);
    if (!account?.tenantId) {
      throw new ForbiddenException("Unknown Telegram bot");
    }
    const creds = await this.tenantRepo.getCredentials(account.tenantId);
    const expected = creds?.webhookVerifyToken;
    if (!expected || secretHeader !== expected) {
      this.logger.warn(`Rejected Telegram webhook for bot ${botId}: bad secret token.`);
      throw new ForbiddenException("Invalid webhook secret token");
    }

    this.processTelegram.execute(botId, update).catch((err) => {
      this.logger.error(`Error processing inbound Telegram webhook: ${err.message}`, err.stack);
    });

    return { ok: true };
  }

  /**
   * Discord interaction webhook (Ed25519 verified)
   */
  @Post("discord")
  @HttpCode(HttpStatus.OK)
  async handleDiscordWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-signature-ed25519") signature: string,
    @Headers("x-signature-timestamp") timestamp: string,
    @Body() interaction: DiscordInteractionPayload,
  ) {
    const publicKey = await this.resolveDiscordPublicKey(interaction);
    if (!publicKey || !verifyDiscordSignature(req.rawBody ?? "", timestamp, signature, publicKey)) {
      this.logger.warn("Rejected Discord interaction with invalid signature.");
      throw new ForbiddenException("Invalid interaction signature");
    }

    // Discord PING check (type 1)
    if (interaction?.type === 1) {
      return { type: 1 };
    }

    this.processDiscord.execute(interaction).catch((err) => {
      this.logger.error(`Error processing inbound Discord webhook: ${err.message}`, err.stack);
    });

    return { type: 4, data: { content: "Received" } };
  }

  private async resolveDiscordPublicKey(
    interaction: DiscordInteractionPayload,
  ): Promise<string | null> {
    const applicationId = interaction?.application_id;
    if (applicationId) {
      const account = await this.tenantRepo.findAccountByExternalId(
        ChannelType.DISCORD,
        applicationId,
      );
      if (account?.tenantId) {
        const creds = await this.tenantRepo.getCredentials(account.tenantId);
        if (creds?.discordPublicKey) return creds.discordPublicKey;
      }
    }
    return process.env.DISCORD_PUBLIC_KEY || null;
  }
}
