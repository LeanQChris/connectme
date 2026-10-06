import {
  ChannelType,
  Contact,
  Conversation,
  ConversationStatus,
  Message,
  MessageDirection,
  MessageStatus,
} from "@connectme/database";
import { Repository } from "typeorm";

export interface ContactData {
  name: string;
  avatarUrl?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}

/** Shared upsert used by the worker's inbound webhook processors. */
export async function upsertContact(
  contactRepo: Repository<Contact>,
  tenantId: string,
  channel: ChannelType,
  externalId: string,
  data: ContactData,
): Promise<Contact> {
  let contact = await contactRepo.findOne({ where: { tenantId, channel, externalId } });
  if (!contact) {
    contact = contactRepo.create({
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
  return contactRepo.save(contact);
}

export async function findOrCreateConversation(
  convRepo: Repository<Conversation>,
  tenantId: string,
  contactId: string,
  channel: ChannelType,
  accountId?: string | null,
): Promise<Conversation> {
  let conv = await convRepo.findOne({ where: { tenantId, contactId } });
  if (!conv) {
    conv = convRepo.create({
      tenantId,
      contactId,
      channel,
      accountId: accountId || null,
      status: ConversationStatus.OPEN,
      unreadCount: 0,
      lastMessageAt: new Date(),
    });
    conv = await convRepo.save(conv);
  }
  return conv;
}

export async function touchConversation(
  convRepo: Repository<Conversation>,
  conv: Conversation,
  text: string | null,
  inbound: boolean,
): Promise<Conversation> {
  conv.lastMessageText = text;
  conv.lastMessageAt = new Date();
  if (inbound) {
    conv.lastInboundAt = new Date();
    conv.unreadCount = (conv.unreadCount || 0) + 1;
    conv.status = ConversationStatus.OPEN;
  }
  return convRepo.save(conv);
}

export interface CreateInboundMessageInput {
  conversationId: string;
  externalId: string | null;
  channel: ChannelType;
  type: Message["type"];
  text: string | null;
  mediaMimeType?: string | null;
  media?: Message["media"] | null;
  authorName?: string | null;
  status?: MessageStatus;
}

/**
 * Persist an inbound message.
 *
 * Returns null when this message was already stored for the conversation, which
 * lets callers skip the unread bump, the realtime publish, and the follow-up
 * jobs. Providers redeliver webhooks, and `messages` carries a unique
 * (conversationId, externalId) index, so without this guard a redelivery would
 * throw a unique violation, fail the job, and burn every retry.
 */
export async function createMessage(
  messageRepo: Repository<Message>,
  input: CreateInboundMessageInput,
): Promise<Message | null> {
  if (input.externalId) {
    const existing = await messageRepo.findOne({
      where: { conversationId: input.conversationId, externalId: input.externalId },
    });
    if (existing) return null;
  }

  const entity = messageRepo.create({
    conversationId: input.conversationId,
    externalId: input.externalId,
    direction: MessageDirection.INBOUND,
    channel: input.channel,
    type: input.type,
    text: input.text,
    mediaMimeType: input.mediaMimeType ?? null,
    media: input.media ?? null,
    authorName: input.authorName ?? null,
    status: input.status ?? MessageStatus.RECEIVED,
  });

  try {
    return await messageRepo.save(entity);
  } catch (err: any) {
    // 23505 = unique_violation. Two workers racing on the same redelivered event
    // both pass the existence check above; the loser must treat it as a duplicate
    // rather than failing the job.
    if (err?.code === "23505" || /duplicate key/i.test(err?.message ?? "")) {
      return null;
    }
    throw err;
  }
}
