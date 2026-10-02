import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";

@Injectable()
export class TelegramClient implements IChannelClient {
  readonly channel = ChannelType.TELEGRAM;
  private readonly logger = new Logger(TelegramClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const creds = ctx.credentials;
    if (!creds?.telegramTokenEnc) {
      throw new Error("Telegram bot token not configured in Settings.");
    }

    const token = this.aesVault.decrypt<string>(creds.telegramTokenEnc) || creds.telegramTokenEnc;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ctx.contactExternalId,
        text: ctx.text || "",
      }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      this.logger.error(`Telegram send error: ${JSON.stringify(json)}`);
      throw new Error(json?.description || "Telegram send failed");
    }

    return { externalId: String(json?.result?.message_id) };
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    return this.sendText(ctx);
  }
}
