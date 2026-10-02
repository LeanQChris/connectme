import {
  ScheduledPost,
  ScheduledPostStatus,
  ScheduleMode,
  ChannelType,
} from "@connectme/database";

export interface ScheduledPostFilter {
  status?: ScheduledPostStatus;
  accountId?: string;
  channel?: ChannelType;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface CreateScheduledPostData {
  tenantId: string;
  accountId: string;
  channel: ChannelType;
  kind: string;
  caption?: string | null;
  mediaUrls?: string[];
  scheduledFor: Date;
  mode: ScheduleMode;
  status?: ScheduledPostStatus;
  platformContainerId?: string | null;
  platformPostId?: string | null;
  createdBy?: string | null;
}

export interface IScheduledPostRepository {
  create(data: CreateScheduledPostData): Promise<ScheduledPost>;
  findById(tenantId: string, id: string): Promise<ScheduledPost | null>;
  list(tenantId: string, filter?: ScheduledPostFilter): Promise<ScheduledPost[]>;
  update(id: string, partial: Partial<ScheduledPost>): Promise<ScheduledPost>;
  findDue(now: Date, statuses: ScheduledPostStatus[], limit: number): Promise<ScheduledPost[]>;
}
