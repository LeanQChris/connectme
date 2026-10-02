import { Injectable, Logger } from "@nestjs/common";
import { ChannelType } from "@connectme/database";
import { AesVaultService } from "../aes-vault.service";
import {
  IPostClient,
  PostPublishContext,
  PostPublishResult,
} from "../post-publisher.interface";

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
    return this.aesVault.decrypt<string>(enc) || enc;
  }

  private graphUrl(path: string): string {
    const version = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";
    return `https://graph.facebook.com/${version}/${path}`;
  }

  async schedule(ctx: PostPublishContext): Promise<PostPublishResult> {
    const scheduledFor = ctx.scheduledFor;
    if (!scheduledFor) throw new Error("scheduledFor is required for native scheduling.");
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
    const imageUrl = ctx.mediaUrls?.[0];

    const body: Record<string, unknown> = scheduledFor
      ? {
          published: false,
          scheduled_publish_time: Math.floor(scheduledFor.getTime() / 1000),
        }
      : { published: true };

    let path: string;
    if (imageUrl) {
      path = `${pageId}/photos`;
      body.url = imageUrl;
      body.caption = ctx.caption || "";
    } else {
      path = `${pageId}/feed`;
      body.message = ctx.caption || "";
    }

    const res = await fetch(this.graphUrl(path), {
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

  async cancel(ctx: PostPublishContext, platformPostId: string): Promise<void> {
    const token = this.token(ctx);
    const res = await fetch(this.graphUrl(`${platformPostId}?access_token=${encodeURIComponent(token)}`), {
      method: "DELETE",
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Facebook cancel error: ${JSON.stringify(json)}`);
      throw new Error(json?.error?.message || "Facebook cancel failed");
    }
  }

  async isPublished(ctx: PostPublishContext, platformPostId: string): Promise<boolean> {
    const token = this.token(ctx);
    const res = await fetch(
      this.graphUrl(
        `${platformPostId}?fields=is_published&access_token=${encodeURIComponent(token)}`,
      ),
    );
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return false;
    return json?.is_published === true;
  }
}
