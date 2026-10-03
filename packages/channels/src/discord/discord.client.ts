import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";
import { fetchWithTimeout } from "../http";

@Injectable()
export class DiscordClient implements IChannelClient {
  readonly channel = ChannelType.DISCORD;
  private readonly logger = new Logger(DiscordClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private token(ctx: ChannelSendContext): string {
    const enc = ctx.credentials?.discordBotTokenEnc;
    if (!enc) throw new Error("Discord Bot Token not configured in Settings.");
    return this.aesVault.decryptStrict<string>(enc);
  }

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    return this.post(ctx, { content: ctx.text || "" });
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    if (!ctx.mediaUrl) throw new Error("Discord media send requires a mediaUrl.");
    const isImage = ctx.mimeType?.startsWith("image/") || ctx.type === "image";
    if (!isImage) {
      throw new Error("Discord sends only support image embeds; attach a link for other media.");
    }
    return this.post(ctx, {
      content: ctx.text || "",
      embeds: [{ image: { url: ctx.mediaUrl } }],
    });
  }

  private async post(
    ctx: ChannelSendContext,
    body: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    const token = this.token(ctx);
    const res = await fetchWithTimeout(
      `https://discord.com/api/v10/channels/${ctx.contactExternalId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Discord send error: ${JSON.stringify(json)}`);
      throw new Error(json?.message || "Discord send failed");
    }

    return { externalId: json?.id ?? null };
  }
}
