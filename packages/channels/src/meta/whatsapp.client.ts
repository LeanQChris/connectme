import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";
import { graphUrl } from "./graph";
import { ChannelHttpError, fetchWithTimeout } from "../http";

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

    const items = ctx.media && ctx.media.length > 0 ? ctx.media : [];

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

  private async templateRequest(path: string, token: string, body?: Record<string, unknown>): Promise<Record<string, any>> {
    const res = await fetchWithTimeout(graphUrl(path), {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new ChannelHttpError(json?.error?.message || "Meta template request failed", res.status, res.status >= 500 || res.status === 429);
    }
    if (!json || typeof json !== "object" || json.error) throw new Error("Invalid Meta template response");
    return json;
  }

  async submitTemplate(wabaId: string, token: string, body: Record<string, unknown>): Promise<Record<string, any>> {
    return this.templateRequest(`${encodeURIComponent(wabaId)}/message_templates`, token, body);
  }

  async fetchTemplates(wabaId: string, token: string): Promise<Array<Record<string, unknown>>> {
    const templates: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    let after = "";
    for (let page = 0; page < 100; page++) {
      const query = new URLSearchParams({ fields: "id,name,status,category,language,components,rejected_reason", limit: "100" });
      if (after) query.set("after", after);
      const json = await this.templateRequest(`${encodeURIComponent(wabaId)}/message_templates?${query}`, token);
      if (!Array.isArray(json.data)) throw new Error("Invalid Meta template list response");
      templates.push(...json.data);
      if (!json.paging?.next) return templates;
      after = json.paging?.cursors?.after;
      if (!after || seen.has(after)) throw new Error("Meta template pagination did not advance");
      seen.add(after);
    }
    throw new Error("Meta template pagination limit reached; sync was not saved");
  }
}
