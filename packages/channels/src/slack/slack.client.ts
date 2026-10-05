import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { IChannelClient, ChannelSendContext, ChannelSendResult } from "../channel-adapter.interface";
import { AesVaultService } from "../aes-vault.service";
import { fetchWithTimeout } from "../http";

export interface SlackDirectoryUser {
  id: string;
  name: string;
  realName?: string;
  avatarUrl?: string;
  isBot?: boolean;
}

export interface SlackDirectoryChannel {
  id: string;
  name: string;
  isPrivate?: boolean;
  isMember?: boolean;
}

@Injectable()
export class SlackClient implements IChannelClient {
  readonly channel = ChannelType.SLACK;
  private readonly logger = new Logger(SlackClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private token(ctx: ChannelSendContext): string {
    const enc = ctx.credentials?.slackBotTokenEnc;
    if (!enc) throw new Error("Slack Bot Token not configured in Settings.");
    return this.aesVault.decryptStrict<string>(enc);
  }

  async sendText(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const token = this.token(ctx);
    const res = await this.postSlackApi("chat.postMessage", token, {
      channel: ctx.contactExternalId,
      text: ctx.text || "",
    });
    return { externalId: res.ts ? String(res.ts) : null };
  }

  async sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult> {
    const token = this.token(ctx);
    const mediaList = ctx.media && ctx.media.length > 0
      ? ctx.media
      : ctx.mediaUrl
      ? [{ url: ctx.mediaUrl, type: ctx.type, name: "file", mimeType: ctx.mimeType }]
      : [];

    if (mediaList.length === 0) {
      return this.sendText(ctx);
    }

    // Post message with media links/attachments
    const attachments = mediaList.map((m) => {
      if (m.type === "image" || m.mimeType?.startsWith("image/")) {
        return {
          title: m.name || "Image",
          image_url: m.url,
          fallback: m.name || m.url,
        };
      }
      return {
        title: m.name || "Attachment",
        title_link: m.url,
        text: m.url,
        fallback: m.name || m.url,
      };
    });

    const res = await this.postSlackApi("chat.postMessage", token, {
      channel: ctx.contactExternalId,
      text: ctx.text || "",
      attachments,
    });

    return { externalId: res.ts ? String(res.ts) : null };
  }

  async listChannels(token: string): Promise<SlackDirectoryChannel[]> {
    try {
      const res = await this.postSlackApi("conversations.list", token, {
        types: "public_channel,private_channel",
        limit: 100,
        exclude_archived: true,
      });
      return (res.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        isPrivate: Boolean(ch.is_private),
        isMember: Boolean(ch.is_member),
      }));
    } catch (err: any) {
      this.logger.warn(`Failed to fetch Slack channels: ${err.message}`);
      return [];
    }
  }

  async listUsers(token: string): Promise<SlackDirectoryUser[]> {
    try {
      const res = await this.postSlackApi("users.list", token, {
        limit: 200,
      });
      return (res.members || [])
        .filter((m: any) => !m.deleted && m.id !== "USLACKBOT")
        .map((m: any) => ({
          id: m.id,
          name: m.name || m.profile?.display_name || m.real_name,
          realName: m.profile?.real_name || m.real_name,
          avatarUrl: m.profile?.image_72 || m.profile?.image_48,
          isBot: Boolean(m.is_bot),
        }));
    } catch (err: any) {
      this.logger.warn(`Failed to fetch Slack users: ${err.message}`);
      return [];
    }
  }

  async getUserInfo(userId: string, token: string): Promise<{ name?: string; avatarUrl?: string } | null> {
    try {
      const res = await this.postSlackApi("users.info", token, { user: userId });
      const user = res.user;
      if (!user) return null;
      return {
        name: user.profile?.display_name || user.profile?.real_name || user.name,
        avatarUrl: user.profile?.image_72 || user.profile?.image_48,
      };
    } catch {
      return null;
    }
  }

  private async postSlackApi(method: string, token: string, body: Record<string, unknown>): Promise<any> {
    const res = await fetchWithTimeout(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      this.logger.error(`Slack API ${method} error: ${JSON.stringify(json)}`);
      throw new Error(json.error || `Slack ${method} failed`);
    }
    return json;
  }
}
