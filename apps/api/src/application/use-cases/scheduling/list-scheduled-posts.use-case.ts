import { Injectable, Inject } from "@nestjs/common";
import {
  IScheduledPostRepository,
  ScheduledPostFilter,
} from "../../../domain/repositories/i-scheduled-post.repository";

@Injectable()
export class ListScheduledPostsUseCase {
  constructor(
    @Inject("IScheduledPostRepository")
    private readonly repo: IScheduledPostRepository,
  ) {}

  async execute(tenantId: string, filter: ScheduledPostFilter = {}) {
    return this.repo.list(tenantId, filter);
  }
}
