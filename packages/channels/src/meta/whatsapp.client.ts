import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";
import { graphUrl } from "./graph";
import { fetchWithTimeout } from "../http";

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

    const token = this.aesVault.decryptStrict<string>(creds.waAccessTokenEnc);
    return this.post(creds.waPhoneNumberId, token, {
      messaging_product: "whatsapp",
      to: ctx.contactExternalId,
      type: "text",
      text: { body: ctx.text || "" },
    });
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const creds = ctx.credentials;
    if (!creds?.waPhoneNumberId || !creds?.waAccessTokenEnc) {
      throw new Error("WhatsApp Cloud API credentials not configured.");
    }

    const items = ctx.media && ctx.media.length > 0
      ? ctx.media
      : ctx.mediaUrl
      ? [{ url: ctx.mediaUrl, type: ctx.type, name: "document", mimeType: ctx.mimeType }]
      : [];

    if (items.length === 0) {
      return this.sendText(ctx);
    }

    const token = this.aesVault.decryptStrict<string>(creds.waAccessTokenEnc);
    let primaryExternalId: string | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const type = (item.type || this.detectType(item.mimeType ?? undefined)).toLowerCase();
      const mediaObject: Record<string, unknown> = { link: item.url };
      if (i === 0 && ctx.text && type !== "audio") {
        mediaObject.caption = ctx.text;
      }
      if (type === "document") {
        mediaObject.filename = item.name || "document";
      }

      const res = await this.post(creds.waPhoneNumberId, token, {
        messaging_product: "whatsapp",
        to: ctx.contactExternalId,
        type,
        [type]: mediaObject,
      });

      if (!primaryExternalId) {
        primaryExternalId = res.externalId;
      }
    }

    return { externalId: primaryExternalId };
  }

  private detectType(mimeType?: string): string {
    if (mimeType?.startsWith("image/")) return "image";
    if (mimeType?.startsWith("video/")) return "video";
    if (mimeType?.startsWith("audio/")) return "audio";
    return "document";
  }

  private async post(
    phoneNumberId: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    const res = await fetchWithTimeout(graphUrl(`${phoneNumberId}/messages`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`WhatsApp send error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "WhatsApp send failed");
    }

    return { externalId: json?.messages?.[0]?.id ?? null };
  }
}
