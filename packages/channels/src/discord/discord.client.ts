import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";

@Injectable()
export class DiscordClient implements IChannelClient {
  readonly channel = ChannelType.DISCORD;
  private readonly logger = new Logger(DiscordClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const creds = ctx.credentials;
    if (!creds?.discordBotTokenEnc) {
      throw new Error("Discord Bot Token not configured in Settings.");
    }

    const token = this.aesVault.decrypt<string>(creds.discordBotTokenEnc) || creds.discordBotTokenEnc;
    const url = `https://discord.com/api/v10/channels/${ctx.contactExternalId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: ctx.text || "",
      }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Discord send error: ${JSON.stringify(json)}`);
      throw new Error(json?.message || "Discord send failed");
    }

    return { externalId: json?.id ?? null };
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    return this.sendText(ctx);
  }
}
