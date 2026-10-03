import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Conversation, Message, MessageStatus } from "@connectme/database";
import { IMessageRepository } from "../../../domain/repositories/i-message.repository";

@Injectable()
export class TypeOrmMessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  private scoped(alias: string, tenantId: string) {
    return this.messageRepo
      .createQueryBuilder(alias)
      .innerJoin(`${alias}.conversation`, "c")
      .where("c.tenantId = :tenantId", { tenantId });
  }

  async findById(tenantId: string, id: string): Promise<Message | null> {
    return this.scoped("m", tenantId).andWhere("m.id = :id", { id }).getOne();
  }

  async findByExternalId(tenantId: string, externalId: string): Promise<Message | null> {
    return this.scoped("m", tenantId)
      .andWhere("m.externalId = :externalId", { externalId })
      .getOne();
  }

  async findByConversationId(
    tenantId: string,
    conversationId: string,
    limit = 100,
  ): Promise<Message[]> {
    return this.scoped("m", tenantId)
      .andWhere("m.conversationId = :conversationId", { conversationId })
      .orderBy("m.createdAt", "ASC")
      .take(limit)
      .getMany();
  }

  async findMessagesPage(
    tenantId: string,
    conversationId: string,
    limit: number,
    before?: string,
  ): Promise<Message[]> {
    const qb = this.scoped("m", tenantId)
      .andWhere("m.conversationId = :conversationId", { conversationId })
      .orderBy("m.createdAt", "DESC")
      .take(limit);
    if (before) {
      qb.andWhere("m.createdAt < :before", { before: new Date(before) });
    }
    const rows = await qb.getMany();
    return rows.reverse();
  }

  async createMessage(tenantId: string, message: Partial<Message>): Promise<Message> {
    if (!message.conversationId) {
      throw new Error("conversationId is required to create a message.");
    }
    const owned = await this.messageRepo.manager
      .getRepository(Conversation)
      .findOne({ where: { id: message.conversationId, tenantId } });
    if (!owned) {
      throw new Error("Conversation not found for tenant.");
    }
    const entity = this.messageRepo.create(message);
    return this.messageRepo.save(entity);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: MessageStatus,
    errorDetail?: string,
  ): Promise<Message | null> {
    const existing = await this.findById(tenantId, id);
    if (!existing) return null;
    await this.messageRepo.update({ id: existing.id }, { status, errorDetail: errorDetail || null });
    return this.findById(tenantId, existing.id);
  }

  async updateStatusByExternalId(
    tenantId: string,
    externalId: string,
    status: MessageStatus,
    errorDetail?: string,
  ): Promise<Message | null> {
    const existing = await this.messageRepo
      .createQueryBuilder("m")
      .innerJoin("m.conversation", "c")
      .where("c.tenantId = :tenantId", { tenantId })
      .andWhere("m.externalId = :externalId", { externalId })
      .getOne();
    if (!existing) return null;
    await this.messageRepo.update(
      { id: existing.id },
      { status, errorDetail: errorDetail || null },
    );
    return this.findById(tenantId, existing.id);
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
