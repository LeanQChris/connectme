import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import {
  IChannelClient,
  ChannelSendContext,
  ChannelSendResult,
  ChannelMediaItem,
} from "../channel-adapter.interface";
import { downloadRemoteMedia } from "../meta/media";
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

  // Bounded so a busy workspace cannot grow it without limit. Keyed by
  // channel id; Slack channel names rarely change, so no TTL is needed.
  private static conversationCache = new Map<string, { name: string; isDirectMessage: boolean }>();
  private static readonly CONVERSATION_CACHE_MAX = 1000;

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
    const mediaList = ctx.media && ctx.media.length > 0 ? ctx.media : [];

    if (mediaList.length === 0) {
      return this.sendText(ctx);
    }

    // Prefer real files: an `attachments` entry with image_url only unfurls as a
    // link, which is wrong when the agent attached an actual document. Slack's
    // modern flow is getUploadURLExternal -> POST bytes -> completeUploadExternal.
    // Any failure (expired URL, missing files:write scope) falls back to link
    // attachments so the content still reaches the channel.
    const uploaded = await this.uploadFiles(ctx, mediaList, token);
    if (uploaded) return uploaded;

    // Fallback: post message with media links/attachments
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

  /**
   * Push media through Slack's modern file-upload endpoints.
   *
   * Returns null when the upload could not be completed, which signals the
   * caller to fall back to link attachments. Note the externalId we get back is
   * a *file* id: `files.completeUploadExternal` does not return the message
   * timestamp, so the file id is what identifies the sent message.
   */
  private async uploadFiles(
    ctx: ChannelSendContext,
    mediaList: ChannelMediaItem[],
    token: string,
  ): Promise<ChannelSendResult | null> {
    try {
      const uploaded: Array<{ id: string; title: string }> = [];

      for (const item of mediaList) {
        const filename = item.name || this.filenameFor(item.url);
        // Outbound media always comes from our own object storage, so the URL is
        // publicly fetchable — inbound Slack files are private and proxied
        // elsewhere.
        const { buffer } = await downloadRemoteMedia(item.url);

        const ticket = await this.slackApi("files.getUploadURLExternal", token, {
          filename,
          length: buffer.byteLength,
          alt: ctx.text || filename,
        });

        const res = await fetchWithTimeout(ticket.upload_url, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Uint8Array(buffer),
        });
        if (!res.ok) {
          throw new Error(`Slack file upload failed: HTTP ${res.status}`);
        }

        uploaded.push({ id: ticket.file_id, title: filename });
      }

      if (uploaded.length === 0) return null;

      const completion = await this.slackApi("files.completeUploadExternal", token, {
        files: uploaded,
        channel_id: ctx.contactExternalId,
        initial_comment: ctx.text || undefined,
      });

      const fileId = completion?.files?.[0]?.id;
      return fileId ? { externalId: String(fileId) } : null;
    } catch (err: any) {
      this.logger.warn(
        `Slack file upload failed, falling back to link attachments: ${err.message}`,
      );
      return null;
    }
  }

  /** Best-effort filename from the URL path when the caller supplied none. */
  private filenameFor(url: string): string {
    try {
      const base = new URL(url).pathname.split("/").filter(Boolean).pop();
      if (base) return base;
    } catch {
      // malformed URL: fall through to the default below
    }
    return "attachment";
  }

  /**
   * List channels the workspace exposes, following the cursor to the end.
   * A single page capped at 100 silently truncated the directory on anything
   * larger than a toy workspace, so this pages with Slack's max page size.
   */
  async listChannels(token: string): Promise<SlackDirectoryChannel[]> {
    const channels: SlackDirectoryChannel[] = [];
    let cursor: string | undefined;
    try {
      do {
        const res = await this.postSlackApi("conversations.list", token, {
          types: "public_channel,private_channel",
          limit: 1000,
          exclude_archived: true,
          ...(cursor ? { cursor } : {}),
        });
        for (const ch of res.channels || []) {
          channels.push({
            id: ch.id,
            name: ch.name,
            isPrivate: Boolean(ch.is_private),
            isMember: Boolean(ch.is_member),
          });
        }
        cursor = res.response_metadata?.next_cursor || undefined;
      } while (cursor);
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch Slack channels: ${err.message} (got ${channels.length} so far)`,
      );
      return channels;
    }
    return channels;
  }

  /** List workspace members, following the cursor so large teams are not truncated. */
  async listUsers(token: string): Promise<SlackDirectoryUser[]> {
    const users: SlackDirectoryUser[] = [];
    let cursor: string | undefined;
    try {
      do {
        const res = await this.postSlackApi("users.list", token, {
          limit: 200,
          ...(cursor ? { cursor } : {}),
        });
        for (const m of res.members || []) {
          if (m.deleted || m.id === "USLACKBOT") continue;
          users.push({
            id: m.id,
            name: m.name || m.profile?.display_name || m.real_name,
            realName: m.profile?.real_name || m.real_name,
            avatarUrl: m.profile?.image_72 || m.profile?.image_48,
            isBot: Boolean(m.is_bot),
          });
        }
        cursor = res.response_metadata?.next_cursor || undefined;
      } while (cursor);
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch Slack users: ${err.message} (got ${users.length} so far)`,
      );
      return users;
    }
    return users;
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

  /**
   * Resolve a conversation label. DMs are named after the counterpart user,
   * public/private channels after the channel, matching how Slack itself shows
   * them. Results are cached because inbound webhooks repeat the same ids.
   */
  async getConversationLabel(
    channelId: string,
    token: string,
  ): Promise<{ name: string; isDirectMessage: boolean } | null> {
    const cached = SlackClient.conversationCache.get(channelId);
    if (cached) return cached;

    // A DM id always starts with D; mpim ids start with G. This avoids an API
    // round-trip for the common case where there is nothing to resolve.
    const isDirectMessage = channelId.startsWith("D") || channelId.startsWith("G");

    let resolved: { name: string; isDirectMessage: boolean } | null = null;
    try {
      const info = await this.slackApi("conversations.info", token, { channel: channelId });
      const ch = info.channel;
      if (ch) {
        if (ch.is_im && ch.user) {
          const user = await this.getUserInfo(ch.user, token);
          if (user?.name) resolved = { name: user.name, isDirectMessage: true };
        } else if (ch.name?.trim()) {
          resolved = { name: ch.name.trim().replace(/^#+/, ""), isDirectMessage };
        }
      }
    } catch (err: any) {
      this.logger.warn(`conversations.info failed for ${channelId}: ${err.message}`);
    }

    // not_in_channel: the app was installed but never added to this channel.
    // Joining a public channel is safe and is what makes names resolve at all.
    if (!resolved && !isDirectMessage) {
      try {
        const joined = await this.slackApi("conversations.join", token, { channel: channelId });
        const name = joined.channel?.name?.trim().replace(/^#+/, "");
        if (name) resolved = { name, isDirectMessage };
      } catch (err: any) {
        this.logger.warn(`conversations.join failed for ${channelId}: ${err.message}`);
      }
    }

    // Both calls above can fail for private channels the bot cannot read
    // directly. Enumerating the workspace's channel lists still resolves the id,
    // and warms the cache for every channel we see along the way.
    if (!resolved && !isDirectMessage) {
      const name = await this.resolveFromChannelLists(channelId, token);
      if (name) resolved = { name, isDirectMessage };
    }

    if (resolved) this.rememberLabel(channelId, resolved);
    return resolved;
  }

  /**
   * Last-resort name lookup: page `conversations.list` and then
   * `users.conversations`, matching by channel id. Pages are capped so an
   * unresolvable id cannot walk the whole workspace on every inbound webhook.
   */
  private async resolveFromChannelLists(channelId: string, token: string): Promise<string | null> {
    const MAX_PAGES = 10;
    for (const method of ["conversations.list", "users.conversations"]) {
      let cursor: string | undefined;
      let pages = 0;
      try {
        do {
          const res = await this.slackApi(method, token, {
            types: "public_channel,private_channel",
            limit: 1000,
            exclude_archived: true,
            ...(cursor ? { cursor } : {}),
          });
          for (const ch of res.channels || []) {
            const name = ch?.name?.trim().replace(/^#+/, "");
            if (!ch?.id || !name) continue;
            this.rememberLabel(ch.id, { name, isDirectMessage: false });
            if (ch.id === channelId) return name;
          }
          cursor = res.response_metadata?.next_cursor || undefined;
        } while (cursor && ++pages < MAX_PAGES);
      } catch (err: any) {
        this.logger.debug(`${method} name lookup failed for ${channelId}: ${err.message}`);
      }
    }
    return null;
  }

  /** Write to the bounded conversation cache, evicting the oldest entry when full. */
  private rememberLabel(
    channelId: string,
    value: { name: string; isDirectMessage: boolean },
  ): void {
    if (SlackClient.conversationCache.size >= SlackClient.CONVERSATION_CACHE_MAX) {
      // Map preserves insertion order, so the first key is the oldest entry.
      const oldest = SlackClient.conversationCache.keys().next().value;
      if (oldest) SlackClient.conversationCache.delete(oldest);
    }
    SlackClient.conversationCache.set(channelId, value);
  }

  /** Slack API call that returns the payload instead of throwing on failure. */
  private async slackApi(
    method: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<any> {
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
      const err = new Error(json.error || `Slack ${method} failed`) as Error & {
        slackError?: string;
      };
      err.slackError = json.error;
      throw err;
    }
    return json;
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
