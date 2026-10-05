import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";
import { graphUrl, toMetaMediaType } from "./graph";
import { fetchWithTimeout } from "../http";

@Injectable()
export class InstagramClient implements IChannelClient {
  readonly channel = ChannelType.INSTAGRAM;
  private readonly logger = new Logger(InstagramClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private token(ctx: ChannelSendContext): string {
    const tokenEnc = ctx.pageAccessToken || ctx.credentials?.pageAccessTokenEnc;
    if (!tokenEnc) throw new Error("Instagram connected Page token not configured.");
    return this.aesVault.decryptStrict<string>(tokenEnc);
  }

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    return this.post(ctx, { text: ctx.text || "" });
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const items = ctx.media && ctx.media.length > 0
      ? ctx.media
      : ctx.mediaUrl
      ? [{ url: ctx.mediaUrl, type: ctx.type, name: "image", mimeType: ctx.mimeType }]
      : [];

    if (items.length === 0) {
      return this.sendText(ctx);
    }

    const skipped: string[] = [];
    let primaryExternalId: string | null = null;

    for (const item of items) {
      const isImage = item.type === "image" || item.mimeType?.startsWith("image/");
      const isAudio = item.type === "audio" || item.mimeType?.startsWith("audio/");
      if (!isImage && !isAudio) {
        skipped.push(`${item.name || item.url} (${item.type || "file"} not supported by Instagram)`);
        continue;
      }

      const res = await this.post(ctx, {
        attachment: {
          type: toMetaMediaType(item.mimeType ?? undefined, isAudio ? "audio" : "image"),
          payload: { url: item.url },
        },
      });

      if (!primaryExternalId) {
        primaryExternalId = res.externalId;
      }
    }

    if (ctx.text) {
      await this.sendText(ctx);
    }

    return { externalId: primaryExternalId, skipped: skipped.length > 0 ? skipped : undefined };
  }

  private async post(
    ctx: ChannelSendContext,
    message: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    const token = this.token(ctx);
    const payload: Record<string, unknown> = {
      recipient: { id: ctx.contactExternalId },
      message,
    };
    if (ctx.tag) {
      payload.messaging_type = "MESSAGE_TAG";
      payload.tag = ctx.tag;
    } else {
      payload.messaging_type = "RESPONSE";
    }

    const res = await fetchWithTimeout(graphUrl("me/messages"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Instagram send error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Instagram send failed");
    }

    return { externalId: json?.message_id ?? null };
  }

  /**
   * Fetches Instagram user profile (username, profile_pic) using Page token.
   */
  async getUserProfile(
    igUserId: string,
    accessToken: string,
  ): Promise<{ name?: string; avatarUrl?: string } | null> {
    try {
      const res = await fetchWithTimeout(
        graphUrl(`${igUserId}?fields=name,username,profile_pic`),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!res.ok) return null;
      const json: any = await res.json().catch(() => ({}));
      return {
        name: json?.name || json?.username || undefined,
        avatarUrl: json?.profile_pic || undefined,
      };
    } catch {
      return null;
    }
  }
}
