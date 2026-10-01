/**
 * Data access layer.
 *
 * Today this is a JSON file so the Meta integration can be exercised without a
 * database. Every read and write goes through this module, so moving to Prisma +
 * SQLite (or Postgres) later means reimplementing these functions only: swap the
 * bodies for Prisma queries and keep the same signatures.
 *
 * Mutations run through a promise queue so concurrent webhook deliveries
 * cannot interleave read-modify-write cycles.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  Channel,
  Contact,
  Conversation,
  ConversationDetail,
  ConversationSummary,
  Message,
  MessageStatus,
  MessageType,
} from "./types";
import { replyWindow } from "./window";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "inbox.json");

interface StoreData {
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
}

const EMPTY: StoreData = { contacts: [], conversations: [], messages: [] };

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<StoreData> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as StoreData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw error;
  }
}

async function write(data: StoreData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Write to a temp file and rename so a crash cannot leave a half-written file.
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, DATA_FILE);
}

/** Serializes a read-modify-write cycle against the store. */
function tx<T>(fn: (data: StoreData) => T): Promise<T> {
  const run = queue.then(async () => {
    const data = await read();
    const result = fn(data);
    await write(data);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

function contactKey(channel: Channel, externalId: string): string {
  return `${channel}:${externalId}`;
}

function contactLabel(contact: Contact): string {
  return contact.name?.trim() || contact.externalId;
}

function summarize(conv: Conversation, data: StoreData): ConversationSummary | null {
  const contact = data.contacts.find((c) => c.id === conv.contactId);
  if (!contact) return null;
  const last = data.messages
    .filter((m) => m.conversationId === conv.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1);
  return {
    id: conv.id,
    contactId: contact.id,
    channel: contact.channel,
    contactName: contactLabel(contact),
    contactExternalId: contact.externalId,
    lastMessage: last?.text ?? null,
    lastMessageAt: conv.lastMessageAt,
    lastInboundAt: conv.lastInboundAt,
    unreadCount: conv.unreadCount,
    status: conv.status,
    window: replyWindow(conv.lastInboundAt),
  };
}

export interface InboundInput {
  channel: Channel;
  /** Platform id: WhatsApp message id / Messenger PSID. Dedup key. */
  externalId: string;
  /** Platform id of the sender: WhatsApp wa_id / Messenger PSID. */
  senderExternalId: string;
  senderName?: string | null;
  text: string | null;
  type: MessageType;
  createdAt: Date;
}

export interface OutboundInput {
  channel: Channel;
  contactExternalId: string;
  externalId: string | null;
  text: string;
  type: MessageType;
  status: MessageStatus;
  error?: string | null;
  createdAt: Date;
}

/** True when the message was new, false when it was already stored. */
export async function recordInbound(input: InboundInput): Promise<boolean> {
  return tx((data) => {
    // Meta retries deliveries; dedupe on the platform message id.
    if (data.messages.some((m) => m.channel === input.channel && m.externalId === input.externalId)) {
      return false;
    }

    const key = contactKey(input.channel, input.senderExternalId);
    let contact = data.contacts.find((c) => contactKey(c.channel, c.externalId) === key);
    if (!contact) {
      contact = {
        id: randomUUID(),
        channel: input.channel,
        externalId: input.senderExternalId,
        name: input.senderName?.trim() || null,
        createdAt: input.createdAt.toISOString(),
      };
      data.contacts.push(contact);
    } else if (input.senderName?.trim() && !contact.name?.trim()) {
      contact.name = input.senderName.trim();
    }

    let conversation = data.conversations.find((c) => c.contactId === contact.id);
    if (!conversation) {
      conversation = {
        id: randomUUID(),
        contactId: contact.id,
        lastMessageAt: input.createdAt.toISOString(),
        lastInboundAt: input.createdAt.toISOString(),
        unreadCount: 0,
        status: "open",
        createdAt: input.createdAt.toISOString(),
      };
      data.conversations.push(conversation);
    }

    data.messages.push({
      id: randomUUID(),
      conversationId: conversation.id,
      direction: "in",
      type: input.type,
      text: input.text,
      externalId: input.externalId,
      channel: input.channel,
      status: "received",
      error: null,
      createdAt: input.createdAt.toISOString(),
    });

    conversation.lastInboundAt = input.createdAt.toISOString();
    conversation.lastMessageAt = input.createdAt.toISOString();
    conversation.unreadCount += 1;
    return true;
  });
}

export async function recordOutbound(input: OutboundInput): Promise<Message | null> {
  return tx((data) => {
    const contact = data.contacts.find(
      (c) => c.channel === input.channel && c.externalId === input.contactExternalId,
    );
    if (!contact) return null;
    const conversation = data.conversations.find((c) => c.contactId === contact.id);
    if (!conversation) return null;

    const message: Message = {
      id: randomUUID(),
      conversationId: conversation.id,
      direction: "out",
      type: input.type,
      text: input.text,
      externalId: input.externalId,
      channel: input.channel,
      status: input.status,
      error: input.error ?? null,
      createdAt: input.createdAt.toISOString(),
    };
    data.messages.push(message);
    conversation.lastMessageAt = message.createdAt;
    return message;
  });
}

/** Applies a delivery status update from Meta to a stored outbound message. */
export async function updateOutboundStatus(
  channel: Channel,
  externalId: string,
  status: MessageStatus,
  error?: string | null,
): Promise<boolean> {
  return tx((data) => {
    const message = data.messages.find(
      (m) => m.channel === channel && m.externalId === externalId && m.direction === "out",
    );
    if (!message) return false;
    message.status = status;
    message.error = error ?? null;
    return true;
  });
}

export async function listConversations(channel?: Channel): Promise<ConversationSummary[]> {
  return tx((data) =>
    data.conversations
      .map((conv) => summarize(conv, data))
      .filter((summary): summary is ConversationSummary => summary !== null)
      .filter((summary) => !channel || summary.channel === channel)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
  );
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  return tx((data) => {
    const conversation = data.conversations.find((c) => c.id === id);
    if (!conversation) return null;
    const summary = summarize(conversation, data);
    if (!summary) return null;
    const messages = data.messages
      .filter((m) => m.conversationId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { conversation: summary, messages };
  });
}

export async function resetUnread(id: string): Promise<void> {
  return tx((data) => {
    const conversation = data.conversations.find((c) => c.id === id);
    if (conversation) conversation.unreadCount = 0;
  });
}