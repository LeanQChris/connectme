import { Contact, ChannelType } from "@connectme/database";

export interface IContactRepository {
  findById(tenantId: string, id: string): Promise<Contact | null>;
  findByExternalId(tenantId: string, channel: ChannelType, externalId: string): Promise<Contact | null>;
  upsertContact(
    tenantId: string,
    channel: ChannelType,
    externalId: string,
    data: { name: string; avatarUrl?: string | null; email?: string | null; phoneNumber?: string | null },
  ): Promise<Contact>;
}
