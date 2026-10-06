import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";
import { fetchWithTimeout } from "../http";

@Injectable()
export class TelegramClient implements IChannelClient {
  readonly channel = ChannelType.TELEGRAM;
  private readonly logger = new Logger(TelegramClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private apiBase(ctx: ChannelSendContext): { token: string; base: string } {
    const enc = ctx.credentials?.telegramTokenEnc;
    if (!enc) throw new Error("Telegram bot token not configured in Settings.");
    const token = this.aesVault.decryptStrict<string>(enc);
    return { token, base: `https://api.telegram.org/bot${token}` };
  }

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const { base } = this.apiBase(ctx);
    return this.post(`${base}/sendMessage`, {
      chat_id: ctx.contactExternalId,
      text: ctx.text || "",
    });
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const items = ctx.media && ctx.media.length > 0 ? ctx.media : [];

    if (items.length === 0) {
      return this.sendText(ctx);
    }

    const { base } = this.apiBase(ctx);

    // If 2-10 photos/videos, send as album
    const allVisual = items.every((i) => i.type === "image" || i.type === "video" || i.mimeType?.startsWith("image/") || i.mimeType?.startsWith("video/"));
    if (items.length >= 2 && items.length <= 10 && allVisual) {
      const mediaGroup = items.map((item, idx) => ({
        type: item.type === "video" || item.mimeType?.startsWith("video/") ? "video" : "photo",
        media: item.url,
        caption: idx === 0 ? ctx.text || "" : undefined,
      }));

      const res = await this.post(`${base}/sendMediaGroup`, {
        chat_id: ctx.contactExternalId,
        media: mediaGroup,
      });
      return { externalId: res.externalId };
    }

    // Otherwise send sequentially
    let primaryExternalId: string | null = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const method = this.methodFor(item.mimeType ?? undefined, item.type);
      const field = method.slice("send".length).toLowerCase();
      const res = await this.post(`${base}/${method}`, {
        chat_id: ctx.contactExternalId,
        [field]: item.url,
        caption: i === 0 ? ctx.text || "" : "",
      });
      if (!primaryExternalId) {
        primaryExternalId = res.externalId;
      }
    }

    return { externalId: primaryExternalId };
  }

  private methodFor(mimeType?: string, type?: string): string {
    if (mimeType?.startsWith("image/") || type === "image") return "sendPhoto";
    if (mimeType?.startsWith("video/") || type === "video") return "sendVideo";
    if (mimeType?.startsWith("audio/") || type === "audio") return "sendAudio";
    return "sendDocument";
  }

  private async post(url: string, body: Record<string, unknown>): Promise<ChannelSendResult> {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      this.logger.error(`Telegram send error: ${JSON.stringify(json)}`);
      throw new Error(json?.description || "Telegram send failed");
    }

    return { externalId: String(json?.result?.message_id) };
  }
}
