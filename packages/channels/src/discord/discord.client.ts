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
    const items = ctx.media && ctx.media.length > 0
      ? ctx.media
      : ctx.mediaUrl
      ? [{ url: ctx.mediaUrl, type: ctx.type, name: "file", mimeType: ctx.mimeType }]
      : [];

    if (items.length === 0) {
      return this.sendText(ctx);
    }

    const embeds = items
      .filter((i) => i.type === "image" || i.mimeType?.startsWith("image/"))
      .slice(0, 10)
      .map((i) => ({ image: { url: i.url } }));

    const nonImages = items.filter((i) => i.type !== "image" && !i.mimeType?.startsWith("image/"));
    let text = ctx.text || "";
    if (nonImages.length > 0) {
      const links = nonImages.map((i) => `📎 [${i.name || "Attachment"}](${i.url})`).join("\n");
      text = text ? `${text}\n\n${links}` : links;
    }

    return this.post(ctx, {
      content: text,
      embeds: embeds.length > 0 ? embeds : undefined,
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
