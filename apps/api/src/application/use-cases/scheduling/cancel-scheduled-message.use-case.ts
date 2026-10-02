import { Injectable, BadRequestException, NotFoundException, Inject } from "@nestjs/common";
import { ScheduledMessageStatus } from "@connectme/database";
import { IScheduledMessageRepository } from "../../../domain/repositories/i-scheduled-message.repository";
import { SchedulingQueueService } from "../../../infrastructure/queue/scheduling-queue.service";

@Injectable()
export class CancelScheduledMessageUseCase {
  constructor(
    @Inject("IScheduledMessageRepository")
    private readonly repo: IScheduledMessageRepository,
    private readonly schedulingQueue: SchedulingQueueService,
  ) {}

  async execute(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundException("Scheduled message not found");

    if (row.status === ScheduledMessageStatus.SENT) {
      throw new BadRequestException("A sent message cannot be canceled.");
    }
    if (row.status === ScheduledMessageStatus.CANCELED) {
      return row;
    }

    await this.schedulingQueue.remove(row.id);
    return this.repo.update(row.id, { status: ScheduledMessageStatus.CANCELED });
  }
}
