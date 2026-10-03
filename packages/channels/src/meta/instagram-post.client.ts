import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { AesVaultService } from "../aes-vault.service";
import { graphUrl } from "./graph";
import { fetchWithTimeout, fetchWithRetry } from "../http";
import {
  IPostClient,
  PostPublishContext,
  PostPublishResult,
} from "../post-publisher.interface";

const CONTAINER_POLL_ATTEMPTS = 10;
const CONTAINER_POLL_INTERVAL_MS = 3_000;

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
    return this.aesVault.decryptStrict<string>(enc);
  }

  async schedule(): Promise<PostPublishResult> {
    throw new Error("Instagram does not support native scheduling; use system-side delivery.");
  }

  async publishNow(ctx: PostPublishContext): Promise<PostPublishResult> {
    const token = this.token(ctx);
    const igUserId = ctx.accountExternalId;
    const mediaUrls = ctx.mediaUrls ?? [];

    if (ctx.kind === "CAROUSEL" || mediaUrls.length > 1) {
      return this.publishCarousel(ctx, token, igUserId, mediaUrls);
    }

    const mediaUrl = mediaUrls[0];
    if (!mediaUrl) {
      throw new Error("Instagram publishing requires a public media URL.");
    }

    const isVideo = this.isVideo(mediaUrl, ctx.kind);
    const containerBody: Record<string, unknown> = isVideo
      ? { media_type: "REELS", video_url: mediaUrl, caption: ctx.caption || "" }
      : { image_url: mediaUrl, caption: ctx.caption || "" };

    const containerId = await this.createContainer(token, igUserId, containerBody);
    await this.waitForContainer(token, containerId);
    const platformPostId = await this.publishContainer(token, igUserId, containerId);

    return {
      platformContainerId: containerId,
      platformPostId,
      nativeScheduled: false,
    };
  }

  /**
   * Instagram carousels are 2–10 items: each item becomes a child container,
   * then a parent CAROUSEL container references them and is published.
   */
  private async publishCarousel(
    ctx: PostPublishContext,
    token: string,
    igUserId: string,
    mediaUrls: string[],
  ): Promise<PostPublishResult> {
    if (mediaUrls.length < 2) {
      throw new Error("An Instagram carousel requires at least 2 media items.");
    }
    if (mediaUrls.length > 10) {
      throw new Error("An Instagram carousel supports at most 10 media items.");
    }

    const childIds: string[] = [];
    for (const mediaUrl of mediaUrls) {
      const isVideo = this.isVideo(mediaUrl, ctx.kind);
      const childId = await this.createContainer(token, igUserId, {
        is_carousel_item: true,
        ...(isVideo ? { media_type: "VIDEO", video_url: mediaUrl } : { image_url: mediaUrl }),
      });
      await this.waitForContainer(token, childId);
      childIds.push(childId);
    }

    const parentId = await this.createContainer(token, igUserId, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: ctx.caption || "",
    });
    await this.waitForContainer(token, parentId);
    const platformPostId = await this.publishContainer(token, igUserId, parentId);

    return {
      platformContainerId: parentId,
      platformPostId,
      nativeScheduled: false,
    };
  }

  private isVideo(mediaUrl: string, kind?: string): boolean {
    return /\.(mp4|mov|m4v)$/i.test(mediaUrl) || kind === "VIDEO" || kind === "REEL";
  }

  private async createContainer(
    token: string,
    igUserId: string,
    body: Record<string, unknown>,
  ): Promise<string> {
    const res = await fetchWithTimeout(graphUrl(`${igUserId}/media`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.id) {
      this.logger.error(`Instagram container error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Instagram container creation failed");
    }
    return json.id;
  }

  private async publishContainer(
    token: string,
    igUserId: string,
    containerId: string,
  ): Promise<string> {
    const res = await fetchWithTimeout(graphUrl(`${igUserId}/media_publish`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ creation_id: containerId }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.id) {
      this.logger.error(`Instagram publish error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Instagram publish failed");
    }
    return json.id;
  }

  private async waitForContainer(token: string, containerId: string): Promise<void> {
    for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt++) {
      const res = await fetchWithRetry(
        graphUrl(`${containerId}?fields=status_code,status`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json: any = await res.json().catch(() => ({}));
      const status = json?.status_code;
      if (status === "FINISHED") return;
      if (status === "ERROR" || status === "EXPIRED") {
        throw new Error(json?.status || `Instagram container ${status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, CONTAINER_POLL_INTERVAL_MS));
    }
    throw new Error("Instagram container did not finish processing in time.");
  }

  async cancel(_ctx: PostPublishContext, platformPostId: string): Promise<void> {
    if (!platformPostId) return;
    throw new Error("Instagram published media cannot be canceled via API.");
  }

  async isPublished(ctx: PostPublishContext, platformPostId: string): Promise<boolean> {
    const token = this.token(ctx);
    const res = await fetchWithRetry(
      graphUrl(`${platformPostId}?fields=permalink`),
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return false;
    const json: any = await res.json().catch(() => ({}));
    return Boolean(json?.permalink);
  }
}
