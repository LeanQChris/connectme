import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";
import { graphUrl, toMetaMediaType } from "./graph";
import { fetchWithTimeout } from "../http";

@Injectable()
export class MessengerClient implements IChannelClient {
  readonly channel = ChannelType.MESSENGER;
  private readonly logger = new Logger(MessengerClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private token(ctx: ChannelSendContext): string {
    const tokenEnc = ctx.pageAccessToken || ctx.credentials?.pageAccessTokenEnc;
    if (!tokenEnc) throw new Error("Facebook Page access token not configured.");
    return this.aesVault.decryptStrict<string>(tokenEnc);
  }

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    return this.post(ctx, { text: ctx.text || "" });
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

    let primaryExternalId: string | null = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const res = await this.post(ctx, {
        attachment: {
          type: toMetaMediaType(item.mimeType ?? undefined, item.type === "image" ? "image" : "file"),
          payload: { url: item.url, is_reusable: true },
        },
      });
      if (!primaryExternalId) {
        primaryExternalId = res.externalId;
      }
    }

    if (ctx.text) {
      await this.sendText(ctx);
    }

    return { externalId: primaryExternalId };
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
      this.logger.error(`Messenger send error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Messenger send failed");
    }

    return { externalId: json?.message_id ?? null };
  }

  /**
   * Fetches Facebook user profile (name, profile_pic) using Page access token.
   */
  async getUserProfile(
    psid: string,
    accessToken: string,
  ): Promise<{ name?: string; avatarUrl?: string } | null> {
    try {
      const res = await fetchWithTimeout(
        graphUrl(`${psid}?fields=first_name,last_name,name,profile_pic`),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!res.ok) return null;
      const json: any = await res.json().catch(() => ({}));
      const name = json?.name || (json?.first_name ? `${json.first_name} ${json.last_name || ""}`.trim() : undefined);
      return {
        name: name || undefined,
        avatarUrl: json?.profile_pic || undefined,
      };
    } catch {
      return null;
    }
  }
}
