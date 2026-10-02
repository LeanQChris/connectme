import { Injectable, BadRequestException, NotFoundException, Inject } from "@nestjs/common";
import { CreateScheduledMessageDto } from "@connectme/contracts";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { IScheduledMessageRepository } from "../../../domain/repositories/i-scheduled-message.repository";
import {
  SchedulingQueueService,
  ScheduledJobData,
} from "../../../infrastructure/queue/scheduling-queue.service";

const MIN_LEAD_MS = 60_000;

export interface CreateScheduledMessageInput {
  tenantId: string;
  dto: CreateScheduledMessageDto;
  createdBy?: string;
}

@Injectable()
export class CreateScheduledMessageUseCase {
  constructor(
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IScheduledMessageRepository")
    private readonly scheduledRepo: IScheduledMessageRepository,
    private readonly schedulingQueue: SchedulingQueueService,
  ) {}

  async execute(input: CreateScheduledMessageInput) {
    const { tenantId, dto } = input;

    if (!dto.text && !dto.mediaUrl) {
      throw new BadRequestException("A scheduled message needs text or media.");
    }

    const fireAt = new Date(dto.scheduledFor);
    if (Number.isNaN(fireAt.getTime())) {
      throw new BadRequestException("Invalid scheduledFor date.");
    }
    if (fireAt.getTime() < Date.now() + MIN_LEAD_MS) {
      throw new BadRequestException("Scheduled time must be at least 1 minute in the future.");
    }

    const conv = await this.convRepo.findById(tenantId, dto.conversationId);
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }

    const row = await this.scheduledRepo.create({
      tenantId,
      conversationId: conv.id,
      channel: conv.channel,
      text: dto.text ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      mediaType: dto.mediaType ? dto.mediaType.toUpperCase() : null,
      scheduledFor: fireAt,
      createdBy: input.createdBy ?? dto.createdBy ?? null,
    });

    const jobData: ScheduledJobData = { kind: "message", id: row.id, tenantId };
    await this.schedulingQueue.enqueue(jobData, fireAt);

    return row;
  }
}
