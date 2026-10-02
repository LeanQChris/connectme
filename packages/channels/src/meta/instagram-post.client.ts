import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { AesVaultService } from "../aes-vault.service";
import {
  IPostClient,
  PostPublishContext,
  PostPublishResult,
} from "../post-publisher.interface";

/**
 * Instagram Content Publishing API. Containers expire after ~24h, so Instagram
 * is scheduled system-side: the worker creates the container and publishes it
 * at fire time.
 */
@Injectable()
export class InstagramPostClient implements IPostClient {
  readonly channel = ChannelType.INSTAGRAM;
  readonly nativeScheduling = false;
  private readonly logger = new Logger(InstagramPostClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private token(ctx: PostPublishContext): string {
    const enc = ctx.accessTokenEnc || ctx.credentials?.pageAccessTokenEnc;
    if (!enc) throw new Error("Instagram connected Page token not configured.");
    return this.aesVault.decrypt<string>(enc) || enc;
  }

  private graphUrl(path: string): string {
    const version = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";
    return `https://graph.facebook.com/${version}/${path}`;
  }

  async schedule(): Promise<PostPublishResult> {
    throw new Error("Instagram does not support native scheduling; use system-side delivery.");
  }

  async publishNow(ctx: PostPublishContext): Promise<PostPublishResult> {
    const token = this.token(ctx);
    const igUserId = ctx.accountExternalId;
    const mediaUrl = ctx.mediaUrls?.[0];
    if (!mediaUrl) {
      throw new Error("Instagram publishing requires a public media URL.");
    }

    const isVideo = /\.(mp4|mov|m4v)$/i.test(mediaUrl) || ctx.kind === "VIDEO" || ctx.kind === "REEL";
    const containerBody: Record<string, unknown> = isVideo
      ? { media_type: "REELS", video_url: mediaUrl, caption: ctx.caption || "" }
      : { image_url: mediaUrl, caption: ctx.caption || "" };

    const containerRes = await fetch(this.graphUrl(`${igUserId}/media`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(containerBody),
    });
    const container: any = await containerRes.json().catch(() => ({}));
    if (!containerRes.ok || !container?.id) {
      this.logger.error(`Instagram container error: ${JSON.stringify(container)}`);
      throw new Error(container?.error?.message || "Instagram container creation failed");
    }

    const publishRes = await fetch(this.graphUrl(`${igUserId}/media_publish`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ creation_id: container.id }),
    });
    const published: any = await publishRes.json().catch(() => ({}));
    if (!publishRes.ok) {
      this.logger.error(`Instagram publish error: ${JSON.stringify(published)}`);
      throw new Error(published?.error?.message || "Instagram publish failed");
    }

    return {
      platformContainerId: container.id,
      platformPostId: published?.id ?? null,
      nativeScheduled: false,
    };
  }

  async cancel(): Promise<void> {
    throw new Error("Instagram published media cannot be canceled via API.");
  }

  async isPublished(ctx: PostPublishContext, platformPostId: string): Promise<boolean> {
    const token = this.token(ctx);
    const res = await fetch(
      this.graphUrl(`${platformPostId}?fields=permalink&access_token=${encodeURIComponent(token)}`),
    );
    return res.ok;
  }
}
