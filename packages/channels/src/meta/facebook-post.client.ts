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

const MIN_LEAD_MS = 10 * 60_000;
const MAX_LEAD_MS = 75 * 24 * 60 * 60_000;

/**
 * Facebook Page publisher. Facebook supports native scheduling on the feed
 * endpoint via `published=false` + `scheduled_publish_time` (10 min to 75 days).
 */
@Injectable()
export class FacebookPostClient implements IPostClient {
  readonly channel = ChannelType.MESSENGER;
  readonly nativeScheduling = true;
  private readonly logger = new Logger(FacebookPostClient.name);

  constructor(private readonly aesVault: AesVaultService) {}

  private token(ctx: PostPublishContext): string {
    const enc = ctx.accessTokenEnc || ctx.credentials?.pageAccessTokenEnc;
    if (!enc) throw new Error("Facebook Page access token not configured.");
    return this.aesVault.decryptStrict<string>(enc);
  }

  async schedule(ctx: PostPublishContext): Promise<PostPublishResult> {
    const scheduledFor = ctx.scheduledFor;
    if (!scheduledFor) throw new Error("scheduledFor is required for native scheduling.");
    const lead = scheduledFor.getTime() - Date.now();
    if (lead < MIN_LEAD_MS || lead > MAX_LEAD_MS) {
      throw new Error("Facebook scheduled time must be between 10 minutes and 75 days from now.");
    }
    return this.submit(ctx, scheduledFor);
  }

  async publishNow(ctx: PostPublishContext): Promise<PostPublishResult> {
    return this.submit(ctx, null);
  }

  private async submit(
    ctx: PostPublishContext,
    scheduledFor: Date | null,
  ): Promise<PostPublishResult> {
    const token = this.token(ctx);
    const pageId = ctx.accountExternalId;
    const mediaUrls = ctx.mediaUrls ?? [];
    const imageUrl = mediaUrls[0];

    const body: Record<string, unknown> = scheduledFor
      ? {
          published: false,
          scheduled_publish_time: Math.floor(scheduledFor.getTime() / 1000),
        }
      : { published: true };

    let path: string;
    if (mediaUrls.length > 1) {
      // Multi-photo: upload each photo unpublished, then attach them to one feed post.
      const mediaIds: string[] = [];
      for (const url of mediaUrls) {
        mediaIds.push(await this.uploadUnpublishedPhoto(token, pageId, url));
      }
      path = `${pageId}/feed`;
      body.message = ctx.caption || "";
      body.attached_media = mediaIds.map((id) => ({ media_fbid: id }));
    } else if (imageUrl) {
      path = `${pageId}/photos`;
      body.url = imageUrl;
      body.caption = ctx.caption || "";
    } else {
      path = `${pageId}/feed`;
      body.message = ctx.caption || "";
    }

    const res = await fetchWithTimeout(graphUrl(path), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Facebook publish error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Facebook publish failed");
    }

    return {
      platformPostId: json?.id ?? json?.post_id ?? null,
      nativeScheduled: Boolean(scheduledFor),
    };
  }

  private async uploadUnpublishedPhoto(
    token: string,
    pageId: string,
    url: string,
  ): Promise<string> {
    const res = await fetchWithTimeout(graphUrl(`${pageId}/photos`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, published: false }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.id) {
      this.logger.error(`Facebook photo upload error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Facebook photo upload failed");
    }
    return json.id;
  }

  async cancel(ctx: PostPublishContext, platformPostId: string): Promise<void> {
    const token = this.token(ctx);
    const res = await fetchWithTimeout(graphUrl(platformPostId), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Facebook cancel error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Facebook cancel failed");
    }
  }

  async isPublished(ctx: PostPublishContext, platformPostId: string): Promise<boolean> {
    const token = this.token(ctx);
    const res = await fetchWithRetry(graphUrl(`${platformPostId}?fields=is_published`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return false;
    return json?.is_published === true;
  }
}
