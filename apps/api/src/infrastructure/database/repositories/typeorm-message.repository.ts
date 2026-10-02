import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message, MessageStatus } from "@connectme/database";
import { IMessageRepository } from "../../../domain/repositories/i-message.repository";

@Injectable()
export class TypeOrmMessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async findById(id: string): Promise<Message | null> {
    return this.messageRepo.findOne({ where: { id } });
  }

  async findByExternalId(externalId: string): Promise<Message | null> {
    return this.messageRepo.findOne({ where: { externalId } });
  }

  async findByConversationId(conversationId: string, limit = 100): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: "ASC" },
      take: limit,
    });
  }

  async createMessage(message: Partial<Message>): Promise<Message> {
    const entity = this.messageRepo.create(message);
    return this.messageRepo.save(entity);
  }

  async updateStatus(id: string, status: MessageStatus, errorDetail?: string): Promise<Message> {
    await this.messageRepo.update({ id }, { status, errorDetail: errorDetail || null });
    return (await this.findById(id))!;
  }

  async updateStatusByExternalId(
    externalId: string,
    status: MessageStatus,
    errorDetail?: string,
  ): Promise<Message | null> {
    const existing = await this.findByExternalId(externalId);
    if (!existing) return null;
    await this.messageRepo.update(
      { externalId },
      { status, errorDetail: errorDetail || null },
    );
    return this.findByExternalId(externalId);
  }

  async searchMessages(tenantId: string, query: string): Promise<Message[]> {
    const qb = this.messageRepo
      .createQueryBuilder("m")
      .innerJoinAndSelect("m.conversation", "c")
      .where("c.tenantId = :tenantId", { tenantId })
      .andWhere("m.text ILIKE :q", { q: `%${query}%` })
      .orderBy("m.createdAt", "DESC")
      .take(50);

    return qb.getMany();
  }
}
