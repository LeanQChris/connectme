import { createHash } from "node:crypto";
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
   * Derive a stable queue job id from the provider's own event id so a redelivery
   * of the same event collapses into one job instead of being processed twice.
   *
   * Returns undefined when we cannot identify the event (providers may send
   * batched payloads), falling back to an auto-generated id — never dedup on a
   * key we are unsure about, because a wrong hit would drop a real message.
   */
  private deriveJobId(jobName: string, payload: unknown): string | undefined {
    const key = this.providerEventKey(jobName, payload);
    if (!key) return undefined;
    // Hash so arbitrary provider ids cannot collide with our own job naming and
    // so a multi-event payload collapses to a single stable key.
    const digest = createHash("sha256").update(key).digest("hex").slice(0, 40);
    return `${jobName}:${digest}`;
  }

  /** The provider's canonical id(s) for the event, or null when unavailable. */
  private providerEventKey(jobName: string, payload: any): string | null {
    switch (jobName) {
      // Meta batches entries/changes/messages/statuses into one payload, so the
      // key is the sorted set of every message and status id it carries.
      case "meta": {
        const ids: string[] = [];
        for (const entry of payload?.entry || []) {
          for (const change of entry?.changes || []) {
            for (const msg of change?.value?.messages || []) if (msg?.id) ids.push(msg.id);
            for (const status of change?.value?.statuses || []) if (status?.id) ids.push(status.id);
          }
        }
        if (ids.length === 0) return null;
        return [...new Set(ids)].sort().join("|");
      }
      case "telegram":
        return payload?.update_id != null ? String(payload.update_id) : null;
      case "discord":
        return payload?.id ? String(payload.id) : null;
      // Slack retries the same delivery with the same event_id; event_ts is the
      // fallback for payloads that omit it.
      case "slack":
        if (payload?.event_id) return String(payload.event_id);
        if (payload?.event?.event_ts) return String(payload.event.event_ts);
        return null;
      default:
        return null;
    }
  }

  /**
   * Hand webhook work to the durable worker queue so the HTTP response stays
   * fast (<50ms). If the queue is unreachable we return 503 so the provider
   * retries — events are never dropped silently, and the API never blocks on
   * ingestion work.
   */
  private async dispatch(
    jobName: string,
    data: Record<string, unknown>,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.queue.add(jobName, data, {
        attempts: 5,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
        // Dedup: a provider redelivery reuses the event id, so BullMQ ignores the
        // duplicate while the first job is still in the queue or within the
        // retention window above.
        jobId: this.deriveJobId(jobName, payload),
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

    await this.dispatch("meta", { payload, receivedAt: Date.now() }, payload);
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

    await this.dispatch("telegram", { botId, payload: update, receivedAt: Date.now() }, update);
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

    await this.dispatch("discord", { payload: interaction, receivedAt: Date.now() }, interaction);
    return { type: 4, data: { content: "Received" } };
  }

  /**
   * Slack Events API webhook
   */
  @Post("slack")
  @HttpCode(HttpStatus.OK)
  async handleSlackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-slack-signature") signature: string,
    @Headers("x-slack-request-timestamp") timestamp: string,
    @Body() body: any,
  ) {
    // Slack URL Verification Challenge
    if (body?.type === "url_verification") {
      return { challenge: body.challenge };
    }

    // Verify Slack signature if secret is present
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (signingSecret && signature && timestamp) {
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
      if (parseInt(timestamp, 10) >= fiveMinutesAgo) {
        const sigBasestring = `v0:${timestamp}:${req.rawBody?.toString("utf8") || ""}`;
        const isValid = verifyHmacSha256(sigBasestring, signingSecret, signature);
        if (!isValid) {
          this.logger.warn("Rejected Slack webhook with invalid signature.");
          throw new ForbiddenException("Invalid Slack webhook signature");
        }
      }
    }

    await this.dispatch("slack", { payload: body, receivedAt: Date.now() }, body);
    return { ok: true };
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
        const secretEnc =
          channel === ChannelType.INSTAGRAM && creds?.instagramAppSecretEnc
            ? creds.instagramAppSecretEnc
            : creds?.metaAppSecretEnc;
        if (!secretEnc) continue;
        const secret = decryptStrict(this.aesVault, secretEnc);
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
