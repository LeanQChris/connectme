import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { AesVaultService } from "../aes-vault.service";
import { fetchWithTimeout } from "../http";
import {
  IPostClient,
  PostPublishContext,
  PostPublishResult,
} from "../post-publisher.interface";

/**
 * Telegram channel/chat publisher. Telegram has no native scheduling, so posts
 * are delivered system-side at fire time. `accountExternalId` is the target
 * chat id; the bot token comes from tenant credentials.
 */
@Injectable()
export class TelegramPostClient implements IPostClient {
  readonly channel = ChannelType.TELEGRAM;
  readonly nativeScheduling = false;
  private readonly logger = new Logger(TelegramPostClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private apiBase(ctx: PostPublishContext): string {
    const enc = ctx.credentials?.telegramTokenEnc;
    if (!enc) throw new Error("Telegram bot token not configured in Settings.");
    const token = this.aesVault.decryptStrict<string>(enc);
    return `https://api.telegram.org/bot${token}`;
  }

  async schedule(): Promise<PostPublishResult> {
    throw new Error("Telegram does not support native scheduling; use system-side delivery.");
  }

  async publishNow(ctx: PostPublishContext): Promise<PostPublishResult> {
    const base = this.apiBase(ctx);
    const chatId = ctx.accountExternalId;
    if (!chatId) throw new Error("Telegram post target (chat id) is missing.");

    const mediaUrl = ctx.mediaUrls?.[0];
    const method = mediaUrl ? this.methodFor(mediaUrl, ctx.kind) : "sendMessage";
    const body: Record<string, unknown> = mediaUrl
      ? { chat_id: chatId, [this.fieldFor(method)]: mediaUrl, caption: ctx.caption || "" }
      : { chat_id: chatId, text: ctx.caption || "" };

    const res = await fetchWithTimeout(`${base}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      this.logger.error(`Telegram post error: ${JSON.stringify(json)}`);
      throw new Error(json?.description || "Telegram publish failed");
    }

    return {
      platformPostId:
        json?.result?.message_id != null ? String(json.result.message_id) : null,
      nativeScheduled: false,
    };
  }

  private methodFor(mediaUrl: string, kind?: string): string {
    if (kind === "IMAGE" || /\.(jpe?g|png|gif|webp)$/i.test(mediaUrl)) return "sendPhoto";
    if (kind === "VIDEO" || kind === "REEL" || /\.(mp4|mov|m4v)$/i.test(mediaUrl)) return "sendVideo";
    return "sendDocument";
  }

  private fieldFor(method: string): string {
    if (method === "sendPhoto") return "photo";
    if (method === "sendVideo") return "video";
    return "document";
  }

  async cancel(ctx: PostPublishContext, platformPostId: string): Promise<void> {
    const base = this.apiBase(ctx);
    const res = await fetchWithTimeout(`${base}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: ctx.accountExternalId, message_id: platformPostId }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      throw new Error(json?.description || "Telegram delete failed");
    }
  }

  async isPublished(): Promise<boolean> {
    // System-side delivery: a stored platformPostId means it was sent.
    return true;
  }
}
