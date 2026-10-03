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
    if (!ctx.mediaUrl) throw new Error("Messenger media send requires a mediaUrl.");
    return this.post(ctx, {
      attachment: {
        type: toMetaMediaType(ctx.mimeType, ctx.type === "image" ? "image" : "file"),
        payload: { url: ctx.mediaUrl, is_reusable: true },
      },
    });
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
}
