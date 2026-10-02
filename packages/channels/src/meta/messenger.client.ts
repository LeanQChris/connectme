import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";

@Injectable()
export class MessengerClient implements IChannelClient {
  readonly channel = ChannelType.MESSENGER;
  private readonly logger = new Logger(MessengerClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const tokenEnc = ctx.pageAccessToken || ctx.credentials?.pageAccessTokenEnc;
    if (!tokenEnc) {
      throw new Error("Facebook Page access token not configured.");
    }

    const token = this.aesVault.decrypt<string>(tokenEnc) || tokenEnc;
    const graphVersion = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";
    const url = `https://graph.facebook.com/${graphVersion}/me/messages`;

    const payload: Record<string, unknown> = {
      recipient: { id: ctx.contactExternalId },
      message: { text: ctx.text || "" },
    };
    if (ctx.tag) {
      payload.messaging_type = "MESSAGE_TAG";
      payload.tag = ctx.tag;
    } else {
      payload.messaging_type = "RESPONSE";
    }

    const res = await fetch(url, {
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

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    return this.sendText(ctx);
  }
}
