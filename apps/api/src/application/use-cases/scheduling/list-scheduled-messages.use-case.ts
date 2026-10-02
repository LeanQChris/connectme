import { Injectable, Inject } from "@nestjs/common";
import {
  IScheduledMessageRepository,
  ScheduledMessageFilter,
} from "../../../domain/repositories/i-scheduled-message.repository";

@Injectable()
export class ListScheduledMessagesUseCase {
  constructor(
    @Inject("IScheduledMessageRepository")
    private readonly repo: IScheduledMessageRepository,
  ) {}

  async execute(tenantId: string, filter: ScheduledMessageFilter = {}) {
    return this.repo.list(tenantId, filter);
  }
}
