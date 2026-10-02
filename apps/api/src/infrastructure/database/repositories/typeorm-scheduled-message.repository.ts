import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { ScheduledMessage, ScheduledMessageStatus } from "@connectme/database";
import {
  IScheduledMessageRepository,
  ScheduledMessageFilter,
  CreateScheduledMessageData,
} from "../../../domain/repositories/i-scheduled-message.repository";

@Injectable()
export class TypeOrmScheduledMessageRepository implements IScheduledMessageRepository {
  constructor(
    @InjectRepository(ScheduledMessage)
    private readonly repo: Repository<ScheduledMessage>,
  ) {}

  async create(data: CreateScheduledMessageData): Promise<ScheduledMessage> {
    const entity = this.repo.create({
      ...data,
      status: ScheduledMessageStatus.PENDING,
    });
    return this.repo.save(entity);
  }

  async findById(tenantId: string, id: string): Promise<ScheduledMessage | null> {
    return this.repo.findOne({ where: { tenantId, id } });
  }

  async list(tenantId: string, filter: ScheduledMessageFilter = {}): Promise<ScheduledMessage[]> {
    const qb = this.repo
      .createQueryBuilder("m")
      .where("m.tenantId = :tenantId", { tenantId });

    if (filter.status) qb.andWhere("m.status = :status", { status: filter.status });
    if (filter.conversationId) {
      qb.andWhere("m.conversationId = :conversationId", { conversationId: filter.conversationId });
    }
    if (filter.from) qb.andWhere("m.scheduledFor >= :from", { from: filter.from });
    if (filter.to) qb.andWhere("m.scheduledFor <= :to", { to: filter.to });

    qb.orderBy("m.scheduledFor", "ASC");
    if (filter.limit) qb.take(filter.limit);
    if (filter.offset) qb.skip(filter.offset);

    return qb.getMany();
  }

  async update(id: string, partial: Partial<ScheduledMessage>): Promise<ScheduledMessage> {
    await this.repo.update({ id }, partial);
    return (await this.repo.findOne({ where: { id } }))!;
  }

  async findDue(now: Date, limit: number): Promise<ScheduledMessage[]> {
    return this.repo.find({
      where: {
        status: ScheduledMessageStatus.PENDING,
        scheduledFor: LessThanOrEqual(now),
      },
      order: { scheduledFor: "ASC" },
      take: limit,
    });
  }
}
