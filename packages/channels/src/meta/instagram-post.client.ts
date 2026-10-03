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
    const mediaUrl = ctx.mediaUrls?.[0];
    if (!mediaUrl) {
      throw new Error("Instagram publishing requires a public media URL.");
    }

    const isVideo = /\.(mp4|mov|m4v)$/i.test(mediaUrl) || ctx.kind === "VIDEO" || ctx.kind === "REEL";
    const containerBody: Record<string, unknown> = isVideo
      ? { media_type: "REELS", video_url: mediaUrl, caption: ctx.caption || "" }
      : { image_url: mediaUrl, caption: ctx.caption || "" };

    const containerRes = await fetchWithTimeout(graphUrl(`${igUserId}/media`), {
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

    await this.waitForContainer(token, container.id);

    const publishRes = await fetchWithTimeout(graphUrl(`${igUserId}/media_publish`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ creation_id: container.id }),
    });
    const published: any = await publishRes.json().catch(() => ({}));
    if (!publishRes.ok || !published?.id) {
      this.logger.error(`Instagram publish error: ${JSON.stringify(published)}`);
      throw new Error(published?.error?.message || "Instagram publish failed");
    }

    return {
      platformContainerId: container.id,
      platformPostId: published.id,
      nativeScheduled: false,
    };
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
