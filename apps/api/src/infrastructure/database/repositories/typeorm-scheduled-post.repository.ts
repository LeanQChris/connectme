import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, Repository } from "typeorm";
import {
  ScheduledPost,
  ScheduledPostStatus,
} from "@connectme/database";
import {
  IScheduledPostRepository,
  ScheduledPostFilter,
  CreateScheduledPostData,
} from "../../../domain/repositories/i-scheduled-post.repository";

@Injectable()
export class TypeOrmScheduledPostRepository implements IScheduledPostRepository {
  constructor(
    @InjectRepository(ScheduledPost)
    private readonly repo: Repository<ScheduledPost>,
  ) {}

  async create(data: CreateScheduledPostData): Promise<ScheduledPost> {
    const entity = this.repo.create({
      ...data,
      mediaUrls: data.mediaUrls ?? [],
      status: data.status ?? ScheduledPostStatus.PENDING,
    });
    return this.repo.save(entity);
  }

  async findById(tenantId: string, id: string): Promise<ScheduledPost | null> {
    return this.repo.findOne({ where: { tenantId, id } });
  }

  async list(tenantId: string, filter: ScheduledPostFilter = {}): Promise<ScheduledPost[]> {
    const qb = this.repo
      .createQueryBuilder("p")
      .where("p.tenantId = :tenantId", { tenantId });

    if (filter.status) qb.andWhere("p.status = :status", { status: filter.status });
    if (filter.accountId) qb.andWhere("p.accountId = :accountId", { accountId: filter.accountId });
    if (filter.channel) qb.andWhere("p.channel = :channel", { channel: filter.channel });
    if (filter.from) qb.andWhere("p.scheduledFor >= :from", { from: filter.from });
    if (filter.to) qb.andWhere("p.scheduledFor <= :to", { to: filter.to });

    qb.orderBy("p.scheduledFor", "ASC");
    if (filter.limit) qb.take(filter.limit);
    if (filter.offset) qb.skip(filter.offset);

    return qb.getMany();
  }

  async update(id: string, partial: Partial<ScheduledPost>): Promise<ScheduledPost> {
    await this.repo.update({ id }, partial);
    return (await this.repo.findOne({ where: { id } }))!;
  }

  async findDue(
    now: Date,
    statuses: ScheduledPostStatus[],
    limit: number,
  ): Promise<ScheduledPost[]> {
    return this.repo.find({
      where: {
        status: In(statuses),
        scheduledFor: LessThanOrEqual(now),
      },
      order: { scheduledFor: "ASC" },
      take: limit,
    });
  }
}
