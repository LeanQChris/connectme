import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Conversation,
  ConversationStatus,
  ChannelType,
} from "@connectme/database";
import {
  IConversationRepository,
  ListConversationsFilter,
} from "../../../domain/repositories/i-conversation.repository";

@Injectable()
export class TypeOrmConversationRepository implements IConversationRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
  ) {}

  async findById(tenantId: string, id: string): Promise<Conversation | null> {
    return this.convRepo.findOne({
      where: { tenantId, id },
      relations: ["contact", "account", "assignee"],
    });
  }

  async findByContactId(tenantId: string, contactId: string): Promise<Conversation | null> {
    return this.convRepo.findOne({
      where: { tenantId, contactId },
      relations: ["contact", "account", "assignee"],
    });
  }

  async findOrCreateForContact(
    tenantId: string,
    contactId: string,
    channel: ChannelType,
    accountId?: string | null,
  ): Promise<Conversation> {
    let conv = await this.convRepo.findOne({
      where: { tenantId, contactId },
      relations: ["contact", "account", "assignee"],
    });

    if (!conv) {
      conv = this.convRepo.create({
        tenantId,
        contactId,
        channel,
        accountId: accountId || null,
        status: ConversationStatus.OPEN,
        unreadCount: 0,
        lastMessageAt: new Date(),
      });
      conv = await this.convRepo.save(conv);
      return (await this.findById(tenantId, conv.id))!;
    }

    return conv;
  }

  async listConversations(
    tenantId: string,
    filter: ListConversationsFilter = {},
  ): Promise<Conversation[]> {
    const qb = this.convRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.contact", "contact")
      .leftJoinAndSelect("c.account", "account")
      .leftJoinAndSelect("c.assignee", "assignee")
      .where("c.tenantId = :tenantId", { tenantId });

    if (filter.channel) {
      qb.andWhere("c.channel = :channel", { channel: filter.channel });
    }
    if (filter.status) {
      qb.andWhere("c.status = :status", { status: filter.status });
    }
    if (filter.assigneeId) {
      qb.andWhere("c.assigneeId = :assigneeId", { assigneeId: filter.assigneeId });
    }
    if (filter.tag) {
      qb.andWhere(":tag = ANY(c.tags)", { tag: filter.tag });
    }

    qb.orderBy("c.lastMessageAt", "DESC");

    if (filter.limit) {
      qb.take(filter.limit);
    }
    if (filter.offset) {
      qb.skip(filter.offset);
    }

    return qb.getMany();
  }

  async updateStatus(
    tenantId: string,
    conversationId: string,
    status: ConversationStatus,
  ): Promise<Conversation> {
    await this.convRepo.update({ tenantId, id: conversationId }, { status });
    return (await this.findById(tenantId, conversationId))!;
  }

  async setAssignee(
    tenantId: string,
    conversationId: string,
    assigneeId: string | null,
  ): Promise<Conversation> {
    await this.convRepo.update({ tenantId, id: conversationId }, { assigneeId });
    return (await this.findById(tenantId, conversationId))!;
  }

  async setTags(
    tenantId: string,
    conversationId: string,
    tags: string[],
  ): Promise<Conversation> {
    await this.convRepo.update({ tenantId, id: conversationId }, { tags });
    return (await this.findById(tenantId, conversationId))!;
  }

  async markAsRead(tenantId: string, conversationId: string): Promise<Conversation> {
    await this.convRepo.update(
      { tenantId, id: conversationId },
      { unreadCount: 0, lastReadAt: new Date() },
    );
    return (await this.findById(tenantId, conversationId))!;
  }

  async updateLastMessage(
    tenantId: string,
    conversationId: string,
    text: string | null,
    inbound: boolean,
  ): Promise<Conversation> {
    const conv = await this.convRepo.findOne({ where: { tenantId, id: conversationId } });
    if (!conv) throw new Error("Conversation not found");

    conv.lastMessageText = text;
    conv.lastMessageAt = new Date();
    if (inbound) {
      conv.lastInboundAt = new Date();
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      conv.status = ConversationStatus.OPEN;
    }
    await this.convRepo.save(conv);
    return (await this.findById(tenantId, conversationId))!;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.convRepo.delete({ tenantId, id });
    return (res.affected ?? 0) > 0;
  }

  async searchConversations(tenantId: string, query: string): Promise<Conversation[]> {
    const qb = this.convRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.contact", "contact")
      .leftJoinAndSelect("c.account", "account")
      .leftJoinAndSelect("c.assignee", "assignee")
      .where("c.tenantId = :tenantId", { tenantId })
      .andWhere(
        "(contact.name ILIKE :q OR contact.externalId ILIKE :q OR c.lastMessageText ILIKE :q)",
        { q: `%${query}%` },
      )
      .orderBy("c.lastMessageAt", "DESC")
      .take(20);

    return qb.getMany();
  }
}
