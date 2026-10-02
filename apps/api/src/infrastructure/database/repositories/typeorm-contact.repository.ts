import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Contact, ChannelType } from "@connectme/database";
import { IContactRepository } from "../../../domain/repositories/i-contact.repository";

@Injectable()
export class TypeOrmContactRepository implements IContactRepository {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async findById(tenantId: string, id: string): Promise<Contact | null> {
    return this.contactRepo.findOne({ where: { tenantId, id } });
  }

  async findByExternalId(
    tenantId: string,
    channel: ChannelType,
    externalId: string,
  ): Promise<Contact | null> {
    return this.contactRepo.findOne({ where: { tenantId, channel, externalId } });
  }

  async upsertContact(
    tenantId: string,
    channel: ChannelType,
    externalId: string,
    data: { name: string; avatarUrl?: string | null; email?: string | null; phoneNumber?: string | null },
  ): Promise<Contact> {
    let contact = await this.contactRepo.findOne({ where: { tenantId, channel, externalId } });
    if (!contact) {
      contact = this.contactRepo.create({
        tenantId,
        channel,
        externalId,
        name: data.name,
        avatarUrl: data.avatarUrl,
        email: data.email,
        phoneNumber: data.phoneNumber,
      });
    } else {
      if (data.name && data.name !== externalId) contact.name = data.name;
      if (data.avatarUrl) contact.avatarUrl = data.avatarUrl;
      if (data.email) contact.email = data.email;
      if (data.phoneNumber) contact.phoneNumber = data.phoneNumber;
    }
    return this.contactRepo.save(contact);
  }
}
