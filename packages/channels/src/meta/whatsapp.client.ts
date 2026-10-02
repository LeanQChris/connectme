import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";

@Injectable()
export class WhatsAppClient implements IChannelClient {
  readonly channel = ChannelType.WHATSAPP;
  private readonly logger = new Logger(WhatsAppClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const creds = ctx.credentials;
    if (!creds?.waPhoneNumberId || !creds?.waAccessTokenEnc) {
      throw new Error("WhatsApp Cloud API credentials not configured.");
    }

    const token = this.aesVault.decrypt<string>(creds.waAccessTokenEnc) || creds.waAccessTokenEnc;
    const graphVersion = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";
    const url = `https://graph.facebook.com/${graphVersion}/${creds.waPhoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: ctx.contactExternalId,
        type: "text",
        text: { body: ctx.text || "" },
      }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`WhatsApp send error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "WhatsApp send failed");
    }

    return { externalId: json?.messages?.[0]?.id ?? null };
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    return this.sendText(ctx);
  }
}
