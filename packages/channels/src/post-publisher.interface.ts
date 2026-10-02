import { ChannelType, TenantCredential } from "@connectme/database";

export interface PostPublishContext {
  accountExternalId: string;
  credentials?: TenantCredential | null;
  accessTokenEnc?: string | null;
  caption?: string;
  mediaUrls?: string[];
  kind?: string;
  scheduledFor?: Date;
  timezone?: string;
}

export interface PostPublishResult {
  platformPostId: string | null;
  platformContainerId?: string | null;
  nativeScheduled: boolean;
}

export interface IPostClient {
  readonly channel: ChannelType;
  readonly nativeScheduling: boolean;
  schedule(ctx: PostPublishContext): Promise<PostPublishResult>;
  publishNow(ctx: PostPublishContext): Promise<PostPublishResult>;
  cancel(ctx: PostPublishContext, platformPostId: string): Promise<void>;
  isPublished(ctx: PostPublishContext, platformPostId: string): Promise<boolean>;
}
