import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { AesVaultService } from "../aes-vault.service";
import { fetchWithTimeout } from "../http";
import {
  IPostClient,
  PostPublishContext,
  PostPublishResult,
} from "../post-publisher.interface";

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Discord channel publisher. Discord has no native scheduling, so posts are
 * delivered system-side at fire time. `accountExternalId` is the target channel
 * id; the bot token comes from tenant credentials.
 */
@Injectable()
export class DiscordPostClient implements IPostClient {
  readonly channel = ChannelType.DISCORD;
  readonly nativeScheduling = false;
  private readonly logger = new Logger(DiscordPostClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private token(ctx: PostPublishContext): string {
    const enc = ctx.credentials?.discordBotTokenEnc;
    if (!enc) throw new Error("Discord bot token not configured in Settings.");
    return this.aesVault.decryptStrict<string>(enc);
  }

  private headers(token: string): Record<string, string> {
    return {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    };
  }

  async schedule(): Promise<PostPublishResult> {
    throw new Error("Discord does not support native scheduling; use system-side delivery.");
  }

  async publishNow(ctx: PostPublishContext): Promise<PostPublishResult> {
    const token = this.token(ctx);
    const channelId = ctx.accountExternalId;
    if (!channelId) throw new Error("Discord post target (channel id) is missing.");

    const mediaUrl = ctx.mediaUrls?.[0];
    const body: Record<string, unknown> = {
      content: [ctx.caption || "", mediaUrl || ""].filter(Boolean).join("\n"),
    };
    if (mediaUrl) {
      body.embeds = [{ image: { url: mediaUrl } }];
    }

    const res = await fetchWithTimeout(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: this.headers(token),
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.id) {
      this.logger.error(`Discord post error: ${JSON.stringify(json)}`);
      throw new Error(json?.message || "Discord publish failed");
    }

    return { platformPostId: json.id, nativeScheduled: false };
  }

  async cancel(ctx: PostPublishContext, platformPostId: string): Promise<void> {
    const token = this.token(ctx);
    const res = await fetchWithTimeout(
      `${DISCORD_API}/channels/${ctx.accountExternalId}/messages/${platformPostId}`,
      { method: "DELETE", headers: this.headers(token) },
    );
    if (!res.ok) {
      const json: any = await res.json().catch(() => ({}));
      throw new Error(json?.message || "Discord delete failed");
    }
  }

  async isPublished(): Promise<boolean> {
    // System-side delivery: a stored platformPostId means it was sent.
    return true;
  }
}
