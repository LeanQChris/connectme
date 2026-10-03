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
  Optional,
  ServiceUnavailableException,
  RawBodyRequest,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { verifyHmacSha256, verifyDiscordSignature, timingSafeEqualString } from "@connectme/crypto";
import { AesVaultService } from "@connectme/channels";
import { ChannelType } from "@connectme/database";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { INBOUND_WEBHOOKS_QUEUE } from "../../infrastructure/queue/queue.constants";
import { MetaWebhookPayload, TelegramWebhookUpdate, DiscordInteractionPayload } from "@connectme/contracts";
import { Public } from "../auth/public.decorator";
import { decryptStrict } from "../../infrastructure/crypto/decrypt-strict";

@Public()
@SkipThrottle()
@Controller("api/webhook")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @InjectQueue(INBOUND_WEBHOOKS_QUEUE)
    private readonly queue: Queue,
    @Optional() private readonly aesVault?: AesVaultService,
  ) {}

  /**
   * Hand webhook work to the durable worker queue so the HTTP response stays
   * fast (<50ms). If the queue is unreachable we return 503 so the provider
   * retries — events are never dropped silently, and the API never blocks on
   * ingestion work.
   */
  private async dispatch(jobName: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.queue.add(jobName, data, {
        attempts: 5,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      });
    } catch (err) {
      this.logger.error(`Failed to enqueue ${jobName} webhook: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        "Inbound webhook queue is temporarily unavailable; provider should retry.",
      );
    }
  }

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
    if (mode === "subscribe" && timingSafeEqualString(verifyToken, expectedToken)) {
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
    const validGlobal = Boolean(
      metaAppSecret && signature && verifyHmacSha256(req.rawBody ?? "", metaAppSecret, signature),
    );
    const validTenant =
      !validGlobal &&
      (await this.verifyWithTenantSecret(req.rawBody ?? Buffer.alloc(0), signature, payload));
    if (!validGlobal && !validTenant) {
      this.logger.warn("Rejected Meta webhook with missing or invalid signature.");
      throw new ForbiddenException("Invalid webhook signature");
    }

    await this.dispatch("meta", { payload, receivedAt: Date.now() });
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
    const account = await this.tenantRepo.findAccountByExternalId(
      ChannelType.TELEGRAM,
      botId,
      "telegram",
    );
    if (!account?.tenantId) {
      throw new ForbiddenException("Unknown Telegram bot");
    }
    const creds = await this.tenantRepo.getCredentials(account.tenantId);
    const expected = creds?.webhookVerifyToken;
    if (!expected || !timingSafeEqualString(secretHeader, expected)) {
      this.logger.warn(`Rejected Telegram webhook for bot ${botId}: bad secret token.`);
      throw new ForbiddenException("Invalid webhook secret token");
    }

    await this.dispatch("telegram", { botId, payload: update, receivedAt: Date.now() });
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

    await this.dispatch("discord", { payload: interaction, receivedAt: Date.now() });
    return { type: 4, data: { content: "Received" } };
  }

  private async verifyWithTenantSecret(
    rawBody: Buffer,
    signature: string,
    payload: MetaWebhookPayload,
  ): Promise<boolean> {
    if (!signature || !this.aesVault) return false;
    try {
      const candidates: Array<{ channel: ChannelType; externalId: string }> = [];
      for (const entry of payload?.entry || []) {
        if (payload.object === "whatsapp_business_account") {
          for (const change of entry.changes || []) {
            const phoneId = change.value?.metadata?.phone_number_id;
            if (phoneId) candidates.push({ channel: ChannelType.WHATSAPP, externalId: phoneId });
          }
        } else {
          const channel =
            payload.object === "instagram" ? ChannelType.INSTAGRAM : ChannelType.MESSENGER;
          if (entry.id) candidates.push({ channel, externalId: entry.id });
        }
      }

      for (const { channel, externalId } of candidates) {
        const account = await this.tenantRepo.findAccountByExternalId(channel, externalId);
        const creds = account?.tenantId
          ? await this.tenantRepo.getCredentials(account.tenantId)
          : null;
        if (!creds?.metaAppSecretEnc) continue;
        const secret = decryptStrict(this.aesVault, creds.metaAppSecretEnc);
        if (verifyHmacSha256(rawBody, secret, signature)) return true;
      }
    } catch (err) {
      this.logger.warn(`Per-tenant Meta signature check failed: ${(err as Error).message}`);
    }
    return false;
  }

  private async resolveDiscordPublicKey(
    interaction: DiscordInteractionPayload,
  ): Promise<string | null> {
    const applicationId = interaction?.application_id;
    if (applicationId) {
      const account = await this.tenantRepo.findAccountByExternalId(
        ChannelType.DISCORD,
        applicationId,
        "discord",
      );
      if (account?.tenantId) {
        const creds = await this.tenantRepo.getCredentials(account.tenantId);
        if (creds?.discordPublicKey) return creds.discordPublicKey;
      }
    }
    return process.env.DISCORD_PUBLIC_KEY || null;
  }
}
