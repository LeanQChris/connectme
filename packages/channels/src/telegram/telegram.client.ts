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
    if (!ctx.mediaUrl) throw new Error("Telegram media send requires a mediaUrl.");
    const { base } = this.apiBase(ctx);
    const method = this.methodFor(ctx.mimeType, ctx.type);
    const field = method.slice("send".length).toLowerCase();
    return this.post(`${base}/${method}`, {
      chat_id: ctx.contactExternalId,
      [field]: ctx.mediaUrl,
      caption: ctx.text || "",
    });
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
