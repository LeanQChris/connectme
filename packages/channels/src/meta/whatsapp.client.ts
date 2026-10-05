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

  async sendTemplateMessage(
    phoneNumberId: string,
    token: string,
    to: string,
    templateName: string,
    languageCode: string = "en_US",
    headerVariables?: string[],
    bodyVariables?: string[],
    buttonPayload?: string,
  ): Promise<ChannelSendResult> {
    const components: Array<Record<string, unknown>> = [];

    if (headerVariables && headerVariables.length > 0) {
      components.push({
        type: "header",
        parameters: headerVariables.map((v) => ({ type: "text", text: v })),
      });
    }

    if (bodyVariables && bodyVariables.length > 0) {
      components.push({
        type: "body",
        parameters: bodyVariables.map((v) => ({ type: "text", text: v })),
      });
    }

    if (buttonPayload) {
      components.push({
        type: "button",
        sub_type: "quick_reply",
        index: "0",
        parameters: [{ type: "payload", payload: buttonPayload }],
      });
    }

    const templatePayload: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode },
    };

    if (components.length > 0) {
      templatePayload.components = components;
    }

    return this.post(phoneNumberId, token, {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: templatePayload,
    });
  }

  async fetchTemplates(
    wabaIdOrPhoneId: string,
    token: string,
  ): Promise<Array<Record<string, unknown>>> {
    // If phone ID is provided, resolve WABA ID first
    let targetWabaId = wabaIdOrPhoneId;
    try {
      const phoneRes = await fetchWithTimeout(
        graphUrl(`${wabaIdOrPhoneId}?fields=whatsapp_business_account`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const phoneJson: any = await phoneRes.json().catch(() => ({}));
      if (phoneJson?.whatsapp_business_account?.id) {
        targetWabaId = phoneJson.whatsapp_business_account.id;
      }
    } catch {
      // If direct call fails or is already a WABA ID, fallback to targetWabaId
    }

    const url = graphUrl(
      `${targetWabaId}/message_templates?fields=name,status,category,language,components&limit=100`,
    );

    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.warn(`Failed to fetch WhatsApp templates: ${JSON.stringify(json)}`);
      return [];
    }

    return Array.isArray(json?.data) ? json.data : [];
  }
}
