/**
 * Data access layer.
 *
 * The whole inbox is one JSON value in memory: a JSON file locally, a single
 * key in Vercel KV when deployed, because a serverless filesystem is read-only.
 * Every read and write goes through this module, so moving to Prisma + Postgres
 * later means reimplementing these functions only: swap the bodies for Prisma
 * queries and keep the same signatures.
 *
 * Mutations run through a promise queue so concurrent webhook deliveries
 * cannot interleave read-modify-write cycles. That queue only covers one
 * instance; see the concurrency note on tx().
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { config } from "./config";
import type {
  Channel,
  Contact,
  Conversation,
  ConversationDetail,
  ConversationSummary,
  ConversationStatus,
  Message,
  CredentialRecord,
  MessageMedia,
  MessageStatus,
  MessageType,
  SearchHit,
  Snippet,
  TenantUser,
  TyperEntry,
  UserSettings,
  WidgetOutboxItem,
} from "./types";
import { replyWindow } from "./window";
import { isMediaKind } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "inbox.json");
const KV_KEY = "connectme:inbox";

interface StoreData {
  users: TenantUser[];
  credentials: CredentialRecord[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  /** Replies waiting in a visitor's browser; drained by the widget poll route. */
  widgetOutbox: WidgetOutboxItem[];
  snippets: Snippet[];
  typing: TyperEntry[];
  userSettings: UserSettings[];
}

const EMPTY: StoreData = {
  users: [],
  credentials: [],
  contacts: [],
  conversations: [],
  messages: [],
  widgetOutbox: [],
  snippets: [],
  typing: [],
  userSettings: [],
};

let queue: Promise<unknown> = Promise.resolve();

/**
 * Where the data lives.
 *
 * Locally it is a JSON file. Serverless hosts (Vercel, Lambda) have a read-only
 * filesystem apart from /tmp, which is per-instance and wiped on every cold
 * start, so there the whole store is kept as one value in Vercel KV instead.
 */
const kv = (() => {
  const url = config.kvRestApiUrl;
  const token = config.kvRestApiToken;
  if (!url || !token) return null;

  const send = async (command: string, body?: string): Promise<unknown> => {
    const response = await fetch(`${url}/${command}/${KV_KEY}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`KV ${command} failed: HTTP ${response.status}`);
    const json = (await response.json()) as { result: unknown };
    return json.result;
  };

  return {
    read: async (): Promise<string | null> => (await send("get")) as string | null,
    write: (data: StoreData): Promise<unknown> => send("set", JSON.stringify(data)),
  };
})();

export function normalizeExternalId(channel: Channel, externalId: string): string {
  if (!externalId) return "";
  if (channel === "whatsapp") {
    // Strip leading '+' and any whitespace, dashes, or parentheses
    const digits = externalId.replace(/[^0-9]/g, "");
    return digits || externalId.trim();
  }
  return externalId.trim();
}

/**
 * Fills in the message fields older records predate: `media` was a single
 * `mediaUrl`, and `externalIds` did not exist.
 */
function normalizeMessage(message: Message): Message {
  if (!Array.isArray(message.media)) {
    const legacy = (message as Message & { mediaUrl?: string | null }).mediaUrl ?? null;
    message.media = legacy
      ? [
          {
            url: legacy,
            type: isMediaKind(message.type) ? message.type : "document",
            mimeType: "application/octet-stream",
            name: null,
            size: null,
          },
        ]
      : [];
  }
  if (!Array.isArray(message.externalIds)) {
    message.externalIds = message.externalId ? [message.externalId] : [];
  }
  return message;
}

/**
 * One-time migration & data consistency normalization:
 * - Multi-tenancy migration: records without owner attached to earliest account.
 * - WhatsApp phone normalization & conversation deduplication.
 */
function normalize(data: Partial<StoreData>): StoreData {
  const merged: StoreData = {
    users: data.users ?? [],
    credentials: data.credentials ?? [],
    contacts: data.contacts ?? [],
    conversations: data.conversations ?? [],
    messages: data.messages ?? [],
    widgetOutbox: data.widgetOutbox ?? [],
    snippets: data.snippets ?? [],
    typing: data.typing ?? [],
    userSettings: data.userSettings ?? [],
  };

  const owner = [...merged.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.userId;
  if (owner) {
    for (const contact of merged.contacts) {
      if (!contact.userId) contact.userId = owner;
    }
    for (const conversation of merged.conversations) {
      if (!conversation.userId) conversation.userId = owner;
      if (!Array.isArray(conversation.tags)) conversation.tags = [];
    }
  }

  // Normalize all contact external IDs (e.g. clean WhatsApp digits) and clean malformed Slack names
  for (const contact of merged.contacts) {
    contact.externalId = normalizeExternalId(contact.channel, contact.externalId);
    if (contact.channel === "slack" && contact.name) {
      // Clean up '#Chris Thapa (#COB6WUKNF4L)' -> 'Chris Thapa'
      const match = contact.name.match(/^#?(.+?)\s*\(\#[A-Z0-9]+\)$/i);
      if (match) {
        contact.name = match[1].trim();
      }
      // Remove accidental leading '#' from people's names
      if (contact.name.startsWith("#") && !contact.externalId.startsWith("C") && !contact.externalId.startsWith("G")) {
        contact.name = contact.name.replace(/^#+/, "");
      }
    }
  }

  // 1. Deduplicate contacts with the same userId + channel + normalized externalId
  const contactMap = new Map<string, Contact>();
  const contactRedirect = new Map<string, string>(); // duplicateContactId -> primaryContactId
  const uniqueContacts: Contact[] = [];

  for (const contact of merged.contacts) {
    const key = `${contact.userId || "default"}:${contactKey(contact.channel, contact.externalId)}`;
    const existing = contactMap.get(key);
    if (!existing) {
      contactMap.set(key, contact);
      uniqueContacts.push(contact);
    } else {
      // Merge duplicate contact info into existing primary
      contactRedirect.set(contact.id, existing.id);
      if ((!existing.name || existing.name === existing.externalId) && contact.name && contact.name !== contact.externalId) {
        existing.name = contact.name;
      }
      if (!existing.avatarUrl && contact.avatarUrl) {
        existing.avatarUrl = contact.avatarUrl;
      }
    }
  }
  merged.contacts = uniqueContacts;

  // 2. Remap contactId in conversations to primary contact
  for (const conv of merged.conversations) {
    if (contactRedirect.has(conv.contactId)) {
      conv.contactId = contactRedirect.get(conv.contactId)!;
    }
  }

  // 3. Deduplicate conversations with the same userId + contactId
  const convMap = new Map<string, Conversation>();
  const convRedirect = new Map<string, string>(); // duplicateConvId -> primaryConvId
  const uniqueConversations: Conversation[] = [];

  for (const conv of merged.conversations) {
    const key = `${conv.userId || "default"}:${conv.contactId}`;
    const existing = convMap.get(key);
    if (!existing) {
      convMap.set(key, conv);
      uniqueConversations.push(conv);
    } else {
      // Merge duplicate conversation into existing primary
      convRedirect.set(conv.id, existing.id);
      if (conv.lastMessageAt && (!existing.lastMessageAt || conv.lastMessageAt > existing.lastMessageAt)) {
        existing.lastMessageAt = conv.lastMessageAt;
      }
      if (conv.lastInboundAt && (!existing.lastInboundAt || conv.lastInboundAt > existing.lastInboundAt)) {
        existing.lastInboundAt = conv.lastInboundAt;
      }
      if (conv.lastReadAt && (!existing.lastReadAt || conv.lastReadAt > existing.lastReadAt)) {
        existing.lastReadAt = conv.lastReadAt;
      }
      existing.unreadCount = (existing.unreadCount || 0) + (conv.unreadCount || 0);
      if (!existing.accountId && conv.accountId) existing.accountId = conv.accountId;
      if (!existing.accountName && conv.accountName) existing.accountName = conv.accountName;
      if (conv.status === "open") existing.status = "open";
      if (Array.isArray(conv.tags) && conv.tags.length > 0) {
        existing.tags = Array.from(new Set([...(existing.tags || []), ...conv.tags]));
      }
    }
  }
  merged.conversations = uniqueConversations;

  // 4. Remap conversationId in messages to primary conversation
  for (const msg of merged.messages) {
    if (convRedirect.has(msg.conversationId)) {
      msg.conversationId = convRedirect.get(msg.conversationId)!;
    }
  }

  // 5. Deduplicate messages in the same conversation
  const uniqueMessages: Message[] = [];
  const seenExtIds = new Set<string>();
  for (const msg of merged.messages) {
    const normalized = normalizeMessage(msg);
    if (msg.externalId) {
      const extKey = `${msg.conversationId}:${msg.externalId}`;
      if (seenExtIds.has(extKey)) continue;
      seenExtIds.add(extKey);
    }
    // Only collapse duplicate OUTBOUND text messages (e.g. echo webhooks matching sent replies)
    if (msg.direction === "out" && msg.text && !msg.media.length) {
      const isDup = uniqueMessages.some((prev) => {
        if (prev.conversationId !== msg.conversationId || prev.direction !== "out") return false;
        if (prev.text !== msg.text || prev.media.length) return false;
        const t1 = new Date(prev.createdAt).getTime();
        const t2 = new Date(msg.createdAt).getTime();
        return Math.abs(t1 - t2) < 15_000;
      });
      if (isDup) continue;
    }

    // Filter out WhatsApp unsupported system container events that have no media
    if (msg.text === "[unsupported]" && !msg.media.length) continue;

    uniqueMessages.push(normalized);
  }
  merged.messages = uniqueMessages;

  return merged;
}

async function read(): Promise<StoreData> {
  if (kv) {
    const raw = await kv.read();
    return raw ? normalize(JSON.parse(raw) as Partial<StoreData>) : structuredClone(EMPTY);
  }
  try {
    return normalize(JSON.parse(await readFile(DATA_FILE, "utf8")) as Partial<StoreData>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw error;
  }
}

async function write(data: StoreData): Promise<void> {
  if (kv) {
    await kv.write(data);
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  // Write to a temp file and rename so a crash cannot leave a half-written file.
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, DATA_FILE);
}

/**
 * Serializes a read-modify-write cycle against the store.
 *
 * Per instance only. Two serverless instances can still race and clobber each
 * other, so the whole document is rewritten each time. Fine for a handful of
 * agents, not for high concurrency — a real database fixes it.
 */
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
  return `${channel}:${normalizeExternalId(channel, externalId)}`;
}

/** Every read and write below is scoped by owner; a wrong userId finds nothing. */
function conversationsOf(data: StoreData, userId: string): Conversation[] {
  return data.conversations.filter((c) => c.userId === userId);
}

function findConversation(data: StoreData, userId: string, id: string): Conversation | undefined {
  return data.conversations.find((c) => c.id === id && c.userId === userId);
}

function contactLabel(contact: Contact): string {
  if (
    contact.channel === "slack" &&
    (contact.externalId.startsWith("C") || contact.externalId.startsWith("G"))
  ) {
    if (contact.name && contact.name.startsWith("#")) {
      return contact.name;
    }
    return `#${contact.name || contact.externalId}`;
  }
  return contact.name?.trim() || contact.externalId;
}

import { fetchInstagramUserProfile, fetchMessengerMessageAttachment, fetchMessengerUserProfile } from "./meta/client";

/**
 * Page/handle name for a conversation.
 *
 * Webhooks only know the platform page id, so `conversation.accountId` may hold
 * either that or our own `meta_page_…` id. Match both, then fall back to whatever
 * name was stamped at intake.
 */
function accountNameOf(
  conv: Conversation,
  data: StoreData,
): { accountId: string | null; accountName: string | null } {
  if (!conv.accountId) {
    return { accountId: null, accountName: conv.accountName ?? null };
  }
  const account = data.credentials
    .find((c) => c.userId === conv.userId)
    ?.accounts?.find((a) => a.id === conv.accountId || a.externalId === conv.accountId);

  return {
    accountId: account?.id ?? conv.accountId,
    accountName: account?.name ?? conv.accountName ?? null,
  };
}

function summarize(conv: Conversation, data: StoreData): ConversationSummary | null {
  const contact = data.contacts.find((c) => c.id === conv.contactId && c.userId === conv.userId);
  if (!contact) return null;
  const account = accountNameOf(conv, data);
  // Notes are internal, so they must never become the inbox preview.
  const last = data.messages
    .filter((m) => m.conversationId === conv.id && m.direction !== "note")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1);
  return {
    id: conv.id,
    contactId: contact.id,
    channel: contact.channel,
    accountId: account.accountId,
    accountName: account.accountName,
    contactName: contactLabel(contact),
    contactExternalId: contact.externalId,
    avatarUrl: contact.avatarUrl ?? null,
    lastMessage: last?.text ?? null,
    lastMessageAt: conv.lastMessageAt,
    lastInboundAt: conv.lastInboundAt,
    unreadCount: conv.unreadCount,
    lastReadAt: conv.lastReadAt ?? null,
    assignee: conv.assignee ?? null,
    tags: conv.tags ?? [],
    status: conv.status,
    snoozedUntil: conv.snoozedUntil ?? null,
    csatRating: conv.csatRating ?? null,
    window:
      contact.channel === "telegram" ||
      contact.channel === "discord" ||
      contact.channel === "slack" ||
      contact.channel === "widget"
        ? { open: true, msRemaining: null }
        : replyWindow(conv.lastInboundAt),
  };
}

export interface InboundInput {
  /** Owning tenant; webhooks resolve this before calling. */
  userId: string;
  channel: Channel;
  accountId?: string | null;
  accountName?: string | null;
  /** Platform id: WhatsApp message id / Messenger PSID. Dedup key. */
  externalId: string;
  /** Platform id of the sender: WhatsApp wa_id / Messenger PSID. */
  senderExternalId: string;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  text: string | null;
  media?: MessageMedia[];
  type: MessageType;
  createdAt: Date;
}

export interface OutboundInput {
  userId: string;
  channel: Channel;
  contactExternalId: string;
  externalId: string | null;
  /** Every platform id, when one message became several on the far side. */
  externalIds?: string[];
  text: string;
  media?: MessageMedia[];
  type: MessageType;
  status: MessageStatus;
  error?: string | null;
  createdAt: Date;
}

/** True when the message was new, false when it was already stored. */
export async function recordInbound(input: InboundInput): Promise<boolean> {
  return tx((data) => {
    const conversationIds = new Set(
      conversationsOf(data, input.userId).map((c) => c.id),
    );

    // Meta retries deliveries; dedupe on the platform message id.
    if (
      data.messages.some(
        (m) =>
          conversationIds.has(m.conversationId) &&
          m.channel === input.channel &&
          m.externalId === input.externalId,
      )
    ) {
      return false;
    }

    // The webhook only carries the platform page id; resolve our own account
    // record so the conversation keeps its page name even if Settings changes.
    const account = input.accountId
      ? data.credentials
          .find((c) => c.userId === input.userId)
          ?.accounts?.find((a) => a.id === input.accountId || a.externalId === input.accountId)
      : undefined;
    const accountId = account?.id ?? input.accountId ?? null;
    const accountName = input.accountName ?? account?.name ?? null;

    const normalizedSenderId = normalizeExternalId(input.channel, input.senderExternalId);
    const key = contactKey(input.channel, normalizedSenderId);
    let contact = data.contacts.find(
      (c) => c.userId === input.userId && contactKey(c.channel, c.externalId) === key,
    );
    if (!contact) {
      contact = {
        id: randomUUID(),
        userId: input.userId,
        channel: input.channel,
        externalId: normalizedSenderId,
        name: input.senderName?.trim() || null,
        avatarUrl: input.senderAvatarUrl ?? null,
        createdAt: input.createdAt.toISOString(),
      };
      data.contacts.push(contact);
    } else {
      if (input.senderName?.trim()) {
        const isSlackChannel =
          input.channel === "slack" &&
          (normalizedSenderId.startsWith("C") || normalizedSenderId.startsWith("G"));
        if (isSlackChannel) {
          if (input.senderName.startsWith("#") || !contact.name || !contact.name.startsWith("#")) {
            contact.name = input.senderName.startsWith("#")
              ? input.senderName
              : `#${input.senderName}`;
          }
        } else if (!contact.name || contact.name === contact.externalId) {
          contact.name = input.senderName.trim();
        }
      }
      if (input.senderAvatarUrl && !contact.avatarUrl) {
        contact.avatarUrl = input.senderAvatarUrl;
      }
    }

    let conversation = data.conversations.find(
      (c) => c.userId === input.userId && c.contactId === contact.id,
    );
    if (!conversation) {
      conversation = {
        id: randomUUID(),
        userId: input.userId,
        contactId: contact.id,
        accountId,
        accountName,
        lastMessageAt: input.createdAt.toISOString(),
        lastInboundAt: input.createdAt.toISOString(),
        unreadCount: 0,
        lastReadAt: input.createdAt.toISOString(),
        assignee: null,
        tags: [],
        status: "open",
        createdAt: input.createdAt.toISOString(),
      };
      data.conversations.push(conversation);
    } else {
      if (accountId) conversation.accountId = accountId;
      if (accountName) conversation.accountName = accountName;
    }

    data.messages.push({
      id: randomUUID(),
      conversationId: conversation.id,
      direction: "in",
      type: input.type,
      text: input.text,
      media: input.media ?? [],
      externalId: input.externalId,
      externalIds: input.externalId ? [input.externalId] : [],
      channel: input.channel,
      status: "received",
      error: null,
      createdAt: input.createdAt.toISOString(),
    });

    conversation.lastInboundAt = input.createdAt.toISOString();
    conversation.lastMessageAt = input.createdAt.toISOString();
    conversation.unreadCount += 1;
    // A new inbound message always resurfaces the thread, archived or not.
    conversation.status = "open";

    const settings = data.userSettings.find((s) => s.userId === input.userId);

    // a) CSAT capture: a bare 1-5 reply right after closing is the rating.
    if (conversation.pendingCsat && typeof input.text === "string" && /^[1-5]\s*$/.test(input.text)) {
      conversation.csatRating = Number(input.text.trim());
      conversation.pendingCsat = false;
    }

    // b) Auto-assign round-robin across the tenant's agents.
    if (!conversation.assignee) {
      const agents = settings?.agents ?? [];
      if (agents.length > 0) {
        const assigned = conversationsOf(data, input.userId).filter((c) => c.assignee).length;
        conversation.assignee = agents[assigned % agents.length];
      }
    }

    // c) Outbound webhook, fire-and-forget.
    if (settings?.webhookUrl) {
      void fetch(settings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "message",
          channel: input.channel,
          senderName: input.senderName ?? undefined,
          text: input.text,
          createdAt: input.createdAt.toISOString(),
        }),
      }).catch((err) => console.warn("[store] outbound webhook failed:", err));
    }

    return true;
  });
}

export interface CreateConversationInput {
  userId: string;
  channel: Channel;
  contactExternalId: string;
  contactName?: string | null;
  contactAvatarUrl?: string | null;
  accountId?: string | null;
  accountName?: string | null;
}

export async function findOrCreateConversation(
  input: CreateConversationInput,
): Promise<ConversationSummary> {
  return tx((data) => {
    const normalizedContactId = normalizeExternalId(input.channel, input.contactExternalId);
    const key = contactKey(input.channel, normalizedContactId);
    let contact = data.contacts.find(
      (c) => c.userId === input.userId && contactKey(c.channel, c.externalId) === key,
    );

    if (!contact) {
      contact = {
        id: randomUUID(),
        userId: input.userId,
        channel: input.channel,
        externalId: normalizedContactId,
        name: input.contactName?.trim() || null,
        avatarUrl: input.contactAvatarUrl ?? null,
        createdAt: new Date().toISOString(),
      };
      data.contacts.push(contact);
    } else {
      if (input.contactName?.trim() && (!contact.name || contact.name === contact.externalId)) {
        contact.name = input.contactName.trim();
      }
      if (input.contactAvatarUrl && !contact.avatarUrl) {
        contact.avatarUrl = input.contactAvatarUrl;
      }
    }

    let conversation = data.conversations.find(
      (c) => c.userId === input.userId && c.contactId === contact!.id,
    );

    if (!conversation) {
      const now = new Date().toISOString();
      conversation = {
        id: randomUUID(),
        userId: input.userId,
        contactId: contact.id,
        accountId: input.accountId ?? null,
        accountName: input.accountName ?? null,
        lastMessageAt: now,
        lastInboundAt: null,
        unreadCount: 0,
        lastReadAt: now,
        assignee: null,
        tags: [],
        status: "open",
        createdAt: now,
      };
      data.conversations.push(conversation);
    } else {
      // Reopen if closed
      conversation.status = "open";
      if (input.accountId) conversation.accountId = input.accountId;
      if (input.accountName) conversation.accountName = input.accountName;
    }

    const summary = summarize(conversation, data);
    if (!summary) {
      throw new Error("Failed to summarize conversation");
    }
    return summary;
  });
}

export async function recordOutbound(input: OutboundInput): Promise<Message | null> {
  return tx((data) => {
    const normalizedContactId = normalizeExternalId(input.channel, input.contactExternalId);
    const contact = data.contacts.find(
      (c) =>
        c.userId === input.userId &&
        c.channel === input.channel &&
        normalizeExternalId(c.channel, c.externalId) === normalizedContactId,
    );
    if (!contact) return null;
    const conversation = data.conversations.find(
      (c) => c.userId === input.userId && c.contactId === contact.id,
    );
    if (!conversation) return null;

    // 1. Check if a message with the exact same externalId already exists
    if (input.externalId) {
      const existingByExt = data.messages.find(
        (m) =>
          m.conversationId === conversation.id &&
          m.direction === "out" &&
          m.externalId === input.externalId,
      );
      if (existingByExt) {
        if (input.status) existingByExt.status = input.status;
        return existingByExt;
      }
    }

    // 2. Check if this is an echo of a recent outbound message sent in the last 30s
    const inputTime = input.createdAt.getTime();
    const recentSent = data.messages.find((m) => {
      if (m.conversationId !== conversation.id || m.direction !== "out") return false;
      if (m.text !== input.text) return false;
      const mTime = new Date(m.createdAt).getTime();
      return Math.abs(inputTime - mTime) < 30_000;
    });

    if (recentSent) {
      if (input.externalId && !recentSent.externalId) {
        recentSent.externalId = input.externalId;
      }
      if (input.status === "delivered" || input.status === "sent") {
        recentSent.status = input.status;
      }
      return recentSent;
    }

    const message: Message = {
      id: randomUUID(),
      conversationId: conversation.id,
      direction: "out",
      type: input.type,
      text: input.text,
      media: input.media ?? [],
      externalId: input.externalId,
      externalIds: input.externalIds ?? (input.externalId ? [input.externalId] : []),
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
  userId: string,
  channel: Channel,
  externalId: string,
  status: MessageStatus,
  error?: string | null,
): Promise<boolean> {
  return tx((data) => {
    const owned = new Set(conversationsOf(data, userId).map((c) => c.id));
    const message = data.messages.find(
      (m) =>
        owned.has(m.conversationId) &&
        m.channel === channel &&
        (m.externalId === externalId || m.externalIds.includes(externalId)) &&
        m.direction === "out",
    );
    if (!message) return false;
    message.status = status;
    message.error = error ?? null;
    return true;
  });
}

async function resolveContactProfile(
  contact: Contact,
  userCreds: CredentialRecord | undefined,
  tenant: { pageAccessToken: string; graphVersion: string },
  matchedToken?: string,
): Promise<boolean> {
  const isMissingOrUnresolvedName =
    !contact.name ||
    contact.name === contact.externalId ||
    /^\d+$/.test(contact.name.trim()) ||
    (contact.channel === "slack" &&
      (contact.name.startsWith("#C") ||
        contact.name.startsWith("#G") ||
        contact.name.startsWith("#D") ||
        contact.name.startsWith("C0") ||
        contact.name.startsWith("D0") ||
        contact.name.startsWith("G0") ||
        contact.name.startsWith("U0") ||
        contact.name.includes("(#C") ||
        contact.name.includes("(#D") ||
        contact.name.includes("(#G") ||
        contact.name.startsWith("Slack User") ||
        contact.name.startsWith("User ")));

  if (!isMissingOrUnresolvedName && contact.avatarUrl) {
    return false;
  }

  let changed = false;

  if (contact.channel === "messenger") {
    const token = matchedToken || tenant.pageAccessToken;
    if (token) {
      try {
        const profile = await fetchMessengerUserProfile(
          contact.externalId,
          token,
          tenant.graphVersion,
        );
        if (profile.name && contact.name !== profile.name) {
          contact.name = profile.name;
          changed = true;
        }
        if (profile.avatarUrl && contact.avatarUrl !== profile.avatarUrl) {
          contact.avatarUrl = profile.avatarUrl;
          changed = true;
        }
      } catch {
        // ignore
      }
    }
  } else if (contact.channel === "instagram") {
    const token = matchedToken || tenant.pageAccessToken;
    if (token) {
      try {
        const profile = await fetchInstagramUserProfile(
          contact.externalId,
          token,
          tenant.graphVersion,
        );
        if (profile.name && contact.name !== profile.name) {
          contact.name = profile.name;
          changed = true;
        }
        if (profile.avatarUrl && contact.avatarUrl !== profile.avatarUrl) {
          contact.avatarUrl = profile.avatarUrl;
          changed = true;
        }
      } catch {
        // ignore
      }
    }
  } else if (contact.channel === "slack") {
    let slackToken = matchedToken;
    if (!slackToken) {
      const targetCred = userCreds || (await listCredentials()).find((c) => Boolean(c.encrypted));
      if (targetCred?.encrypted) {
        try {
          const { decryptSecrets } = await import("./secrets");
          const decrypted = decryptSecrets(targetCred.encrypted);
          slackToken = decrypted?.slackBotToken;
        } catch {
          // ignore
        }
      }
    }
    if (slackToken) {
      try {
        const { fetchSlackChannelName, fetchSlackUserProfile } = await import("./slack/client");
        if (contact.externalId.startsWith("U")) {
          const profile = await fetchSlackUserProfile(slackToken, contact.externalId);
          if (profile?.name && !profile.name.startsWith("User ") && contact.name !== profile.name) {
            contact.name = profile.name;
            if (profile.avatarUrl && contact.avatarUrl !== profile.avatarUrl) {
              contact.avatarUrl = profile.avatarUrl;
            }
            changed = true;
          }
        } else if (contact.externalId.startsWith("C") || contact.externalId.startsWith("G")) {
          const cName = await fetchSlackChannelName(slackToken, contact.externalId);
          if (cName) {
            const formattedName = `#${cName.replace(/^#+/, "")}`;
            if (contact.name !== formattedName) {
              contact.name = formattedName;
              changed = true;
            }
          } else if (!contact.name || !contact.name.startsWith("#")) {
            contact.name = `#${contact.externalId}`;
            changed = true;
          }
        } else if (contact.externalId.startsWith("D")) {
          const cName = await fetchSlackChannelName(slackToken, contact.externalId);
          if (cName && contact.name !== cName) {
            contact.name = cName;
            changed = true;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return changed;
}

export async function listConversations(
  userId: string,
  tenant: { pageAccessToken: string; graphVersion: string },
  channel?: Channel,
): Promise<ConversationSummary[]> {
  const data = await read();
  let updatedAny = false;

  // Resolve profiles for any contact missing a real name or avatar
  const userCreds = data.credentials.find((c) => c.userId === userId);
  for (const contact of data.contacts.filter((c) => c.userId === userId)) {
    const conv = data.conversations.find((c) => c.contactId === contact.id && c.userId === userId);
    const matchedAcc = conv?.accountId
      ? userCreds?.accounts?.find((a) => a.id === conv.accountId || a.externalId === conv.accountId)
      : undefined;
    const token = matchedAcc?.token || tenant.pageAccessToken;

    const resolved = await resolveContactProfile(contact, userCreds, tenant, token);
    if (resolved) updatedAny = true;
  }

  if (updatedAny) {
    void write(data);
  }

  return conversationsOf(data, userId)
    .map((conv) => summarize(conv, data))
    .filter((summary): summary is ConversationSummary => summary !== null)
    .filter((summary) => !channel || summary.channel === channel)
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

async function backfillMessages(
  messages: Message[],
  pageAccessToken: string,
  graphVersion: string,
): Promise<boolean> {
  const missing = messages.filter(
    (m) =>
      m.channel === "messenger" &&
      m.externalId &&
      (!m.media.length || m.text === "[attachment]" || m.type !== "text"),
  );
  if (missing.length === 0) return false;

  let changed = false;
  await Promise.all(
    missing.map(async (message) => {
      try {
        const attach = await fetchMessengerMessageAttachment(
          message.externalId!,
          pageAccessToken,
          graphVersion,
        );
        if (attach.mediaUrl && message.media.length === 0) {
          message.media = [
            {
              url: attach.mediaUrl,
              type: isMediaKind(attach.type) ? attach.type : "document",
              mimeType: "application/octet-stream",
              name: null,
              size: null,
            },
          ];
          message.type = attach.type;
          if (attach.text) message.text = attach.text;
          else if (message.text === "[attachment]") message.text = null;
          changed = true;
        }
      } catch {
        // ignore
      }
    }),
  );
  return changed;
}

export async function getConversation(
  userId: string,
  id: string,
  tenant: { pageAccessToken: string; graphVersion: string },
): Promise<ConversationDetail | null> {
  const data = await read();
  const conversation = findConversation(data, userId, id);
  if (!conversation) return null;

  const contact = data.contacts.find((c) => c.id === conversation.contactId);
  let updatedAny = false;

  if (contact) {
    const userCreds = data.credentials.find((c) => c.userId === userId);
    const matchedAcc = conversation.accountId
      ? userCreds?.accounts?.find((a) => a.id === conversation.accountId || a.externalId === conversation.accountId)
      : undefined;
    const token = matchedAcc?.token || tenant.pageAccessToken;

    const resolved = await resolveContactProfile(contact, userCreds, tenant, token);
    if (resolved) updatedAny = true;
  }

  const messages = data.messages
    .filter((m) => m.conversationId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Quick parallel attachment backfill
  const changedMsg = await backfillMessages(
    messages,
    tenant.pageAccessToken,
    tenant.graphVersion,
  );
  if (updatedAny || changedMsg) {
    void write(data); // persist updated profile and attachments
  }

  const summary = summarize(conversation, data);
  if (!summary) return null;

  return { conversation: summary, messages, typers: getTypersFromData(data, userId, id) };
}

export async function resetUnread(userId: string, id: string): Promise<void> {
  return tx((data) => {
    const conversation = findConversation(data, userId, id);
    if (conversation) {
      conversation.unreadCount = 0;
      conversation.lastReadAt = new Date().toISOString();
    }
  });
}

export async function setSnooze(
  userId: string,
  id: string,
  until: string | null,
): Promise<boolean> {
  return tx((data) => {
    const conversation = findConversation(data, userId, id);
    if (!conversation) return false;
    conversation.snoozedUntil = until;
    return true;
  });
}

export async function setCsatRating(
  userId: string,
  id: string,
  rating: number | null,
): Promise<boolean> {
  return tx((data) => {
    const conversation = findConversation(data, userId, id);
    if (!conversation) return false;
    conversation.csatRating = rating;
    conversation.pendingCsat = false;
    return true;
  });
}

/* ------------------------------------------------------------------ snippets */

export async function listSnippets(userId: string): Promise<Snippet[]> {
  const data = await read();
  return data.snippets.filter((s) => s.userId === userId);
}

export async function addSnippet(
  userId: string,
  shortcut: string,
  text: string,
): Promise<Snippet> {
  return tx((data) => {
    const snippet: Snippet = {
      id: randomUUID(),
      userId,
      shortcut,
      text,
      createdAt: new Date().toISOString(),
    };
    data.snippets.push(snippet);
    return snippet;
  });
}

export async function deleteSnippet(userId: string, id: string): Promise<boolean> {
  return tx((data) => {
    const at = data.snippets.findIndex((s) => s.id === id && s.userId === userId);
    if (at === -1) return false;
    data.snippets.splice(at, 1);
    return true;
  });
}

/* ------------------------------------------------------------------- typing */

export async function setTyping(
  userId: string,
  conversationId: string,
  name: string,
): Promise<TyperEntry> {
  return tx((data) => {
    data.typing = data.typing.filter(
      (t) => !(t.userId === userId && t.conversationId === conversationId),
    );
    const entry: TyperEntry = {
      userId,
      conversationId,
      name,
      until: new Date(Date.now() + 12_000).toISOString(),
    };
    data.typing.push(entry);
    return entry;
  });
}

function getTypersFromData(
  data: StoreData,
  userId: string,
  conversationId: string,
): { name: string; until: string }[] {
  const now = Date.now();
  data.typing = data.typing.filter((t) => Date.parse(t.until) > now);
  return data.typing
    .filter((t) => t.userId === userId && t.conversationId === conversationId)
    .map((t) => ({ name: t.name, until: t.until }));
}

export async function getTypers(
  userId: string,
  conversationId: string,
): Promise<{ name: string; until: string }[]> {
  const data = await read();
  return getTypersFromData(data, userId, conversationId);
}

/* ----------------------------------------------------------------- settings */

function defaultUserSettings(userId: string): UserSettings {
  return { userId, webhookUrl: null, agents: [], templates: [] };
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const data = await read();
  return data.userSettings.find((s) => s.userId === userId) ?? defaultUserSettings(userId);
}

export async function saveUserSettings(
  userId: string,
  patch: Partial<Omit<UserSettings, "userId">>,
): Promise<UserSettings> {
  return tx((data) => {
    const existing = data.userSettings.find((s) => s.userId === userId);
    const next: UserSettings = {
      ...(existing ?? defaultUserSettings(userId)),
      ...patch,
      userId,
    };
    if (existing) Object.assign(existing, next);
    else data.userSettings.push(next);
    return next;
  });
}

/* -------------------------------------------------------------- bulk update */

export async function bulkConversationUpdate(
  userId: string,
  ids: string[],
  patch: { status?: ConversationStatus; assignee?: string | null; tags?: string[] },
): Promise<number> {
  return tx((data) => {
    let count = 0;
    for (const conversation of data.conversations) {
      if (conversation.userId !== userId || !ids.includes(conversation.id)) continue;
      if (patch.status !== undefined) {
        conversation.status = patch.status;
        if (patch.status === "closed") {
          conversation.unreadCount = 0;
          conversation.pendingCsat = true;
        } else {
          conversation.pendingCsat = false;
        }
      }
      if (patch.assignee !== undefined) conversation.assignee = patch.assignee;
      if (patch.tags !== undefined) conversation.tags = patch.tags;
      count += 1;
    }
    return count;
  });
}

/* ------------------------------------------------------------------ metrics */

export async function computeMetrics(userId: string): Promise<{
  conversations: { open: number; closed: number; total: number };
  perChannel: Record<string, number>;
  avgFirstResponseMs: number | null;
  avgCsat: number | null;
  csatCount: number;
}> {
  const data = await read();
  const owned = conversationsOf(data, userId);

  const open = owned.filter((c) => c.status === "open").length;
  const closed = owned.filter((c) => c.status === "closed").length;

  const perChannel: Record<string, number> = {};
  for (const conv of owned) {
    const contact = data.contacts.find((c) => c.id === conv.contactId);
    if (!contact) continue;
    perChannel[contact.channel] = (perChannel[contact.channel] ?? 0) + 1;
  }

  const firstResponses: number[] = [];
  for (const conv of owned) {
    const thread = data.messages
      .filter((m) => m.conversationId === conv.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const firstIn = thread.find((m) => m.direction === "in");
    const firstOut = thread.find((m) => m.direction === "out");
    if (firstIn && firstOut) {
      const delta = Date.parse(firstOut.createdAt) - Date.parse(firstIn.createdAt);
      if (delta >= 0) firstResponses.push(delta);
    }
  }
  const avgFirstResponseMs =
    firstResponses.length > 0
      ? Math.round(firstResponses.reduce((a, b) => a + b, 0) / firstResponses.length)
      : null;

  const rated = owned.filter(
    (c): c is Conversation & { csatRating: number } => typeof c.csatRating === "number",
  );
  const avgCsat =
    rated.length > 0
      ? rated.reduce((sum, c) => sum + c.csatRating, 0) / rated.length
      : null;

  return {
    conversations: { open, closed, total: owned.length },
    perChannel,
    avgFirstResponseMs,
    avgCsat,
    csatCount: rated.length,
  };
}

/** Archives or restores a conversation. Returns false when the id is unknown. */
export async function setStatus(
  userId: string,
  id: string,
  status: ConversationStatus,
): Promise<boolean> {
  return tx((data) => {
    const conversation = findConversation(data, userId, id);
    if (!conversation) return false;
    conversation.status = status;
    if (status === "closed") {
      conversation.unreadCount = 0;
      conversation.pendingCsat = true;
    } else {
      conversation.pendingCsat = false;
    }
    return true;
  });
}

/** Permanently deletes a conversation, its messages, and any orphaned contact. */
export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  return tx((data) => {
    const convIndex = data.conversations.findIndex((c) => c.id === id && c.userId === userId);
    if (convIndex === -1) return false;
    const conversation = data.conversations[convIndex];

    // Remove the conversation
    data.conversations.splice(convIndex, 1);

    // Remove all messages belonging to this conversation
    data.messages = data.messages.filter((m) => m.conversationId !== id);

    // If no other conversations reference this contactId, remove the contact
    const hasOtherConv = data.conversations.some(
      (c) => c.contactId === conversation.contactId && c.userId === userId,
    );
    if (!hasOtherConv) {
      data.contacts = data.contacts.filter((c) => c.id !== conversation.contactId);
    }

    return true;
  });
}

export interface ConversationMetaPatch {
  assignee?: string | null;
  tags?: string[];
}

/** Assigns an owner and/or replaces tags. Returns the fresh summary. */
export async function updateConversationMeta(
  userId: string,
  id: string,
  patch: ConversationMetaPatch,
): Promise<ConversationSummary | null> {
  return tx((data) => {
    const conversation = findConversation(data, userId, id);
    if (!conversation) return null;
    if (patch.assignee !== undefined) conversation.assignee = patch.assignee;
    if (patch.tags !== undefined) conversation.tags = patch.tags;
    return summarize(conversation, data);
  });
}

/**
 * Internal note: stored like a message but never sent to the channel, and it
 * deliberately leaves lastMessageAt alone so it cannot reorder the inbox.
 */
export async function recordNote(
  userId: string,
  id: string,
  text: string,
  author: string,
): Promise<{ message: Message; conversation: ConversationSummary } | null> {
  return tx((data) => {
    const conversation = findConversation(data, userId, id);
    if (!conversation) return null;
    const contact = data.contacts.find((c) => c.id === conversation.contactId);
    if (!contact) return null;

    const message: Message = {
      id: randomUUID(),
      conversationId: id,
      direction: "note",
      type: "text",
      text,
      media: [],
      externalId: null,
      externalIds: [],
      channel: contact.channel,
      status: "received",
      error: null,
      createdAt: new Date().toISOString(),
      author,
    };
    data.messages.push(message);

    const summary = summarize(conversation, data);
    return summary ? { message, conversation: summary } : null;
  });
}

/**
 * Searches contact names, platform ids and message bodies. One hit per
 * conversation, ordered by the newest matching message.
 */
export async function searchConversations(
  userId: string,
  query: string,
  limit = 40,
): Promise<SearchHit[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const data = await read();
  const hits: SearchHit[] = [];

  for (const conv of conversationsOf(data, userId)) {
    const contact = data.contacts.find((c) => c.id === conv.contactId);
    if (!contact) continue;

    const inContact =
      `${contactLabel(contact)} ${contact.externalId}`.toLowerCase().includes(needle);
    const newestMatch = data.messages
      .filter((m) => m.conversationId === conv.id && m.text?.toLowerCase().includes(needle))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .at(-1);

    if (!inContact && !newestMatch) continue;

    const summary = summarize(conv, data);
    if (!summary) continue;

    hits.push({
      conversation: summary,
      snippet: newestMatch ? snippet(newestMatch.text ?? "", needle) : summary.lastMessage ?? "",
      createdAt: newestMatch?.createdAt ?? conv.lastMessageAt,
      direction: newestMatch?.direction ?? "in",
    });
  }

  return hits.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

function snippet(text: string, needle: string, radius = 48): string {
  const at = text.toLowerCase().indexOf(needle);
  if (at === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + needle.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/* -------------------------------------------------------------- website widget */

/**
 * Queues a reply for a visitor's browser to pick up.
 *
 * The widget has no push transport: the page polls, so "sent" only means "queued".
 * The returned id is the message's externalId.
 */
export async function enqueueWidgetMessage(input: {
  userId: string;
  sid: string;
  text: string | null;
  media?: MessageMedia[];
  type: MessageType;
}): Promise<string> {
  return tx((data) => {
    const id = randomUUID();
    data.widgetOutbox.push({
      id,
      userId: input.userId,
      sid: input.sid,
      text: input.text,
      media: input.media ?? [],
      type: input.type,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
    });
    return id;
  });
}

/**
 * Hands the visitor's undelivered replies to their browser and marks them taken.
 * Purges items already delivered a day ago so the queue cannot grow forever.
 */
export async function takeWidgetMessages(
  userId: string,
  sid: string,
  limit = 20,
): Promise<WidgetOutboxItem[]> {
  return tx((data) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    data.widgetOutbox = data.widgetOutbox.filter(
      (item) => !(item.deliveredAt && Date.parse(item.deliveredAt) < cutoff),
    );

    const pending = data.widgetOutbox
      .filter((item) => item.userId === userId && item.sid === sid && !item.deliveredAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);

    const now = new Date().toISOString();
    for (const item of pending) item.deliveredAt = now;
    return pending.map((item) => ({ ...item, deliveredAt: null }));
  });
}

/* ------------------------------------------------------------------ tenancy */

/** Creates or refreshes the local mirror of a Clerk user. */
export async function upsertUser(input: {
  userId: string;
  email: string;
  name: string | null;
}): Promise<TenantUser> {
  return tx((data) => {
    const existing = data.users.find((u) => u.userId === input.userId);
    if (existing) {
      existing.email = input.email || existing.email;
      existing.name = input.name ?? existing.name;
      return existing;
    }
    const user: TenantUser = { ...input, createdAt: new Date().toISOString() };
    data.users.push(user);
    return user;
  });
}

/** Stores an already-encrypted credential blob plus its public routing ids. */
export async function saveCredentials(record: CredentialRecord): Promise<void> {
  return tx((data) => {
    const at = data.credentials.findIndex((c) => c.userId === record.userId);
    if (at === -1) data.credentials.push(record);
    else data.credentials[at] = record;
  });
}

export async function getCredentials(userId: string): Promise<CredentialRecord | null> {
  const data = await read();
  return data.credentials.find((c) => c.userId === userId) ?? null;
}

export async function listCredentials(): Promise<CredentialRecord[]> {
  const data = await read();
  return data.credentials;
}

/** Candidate tenants a webhook could belong to, by the ids inside the payload. */
export async function credentialsByRoutingId(field: {
  waPhoneNumberId?: string;
  pageId?: string;
  telegramBotId?: string;
  widgetId?: string;
}): Promise<CredentialRecord[]> {
  const data = await read();
  return data.credentials.filter((c) => {
    // 1. Check multi-accounts list
    const hasAccountMatch = c.accounts?.some((acc) => {
      if (field.pageId && acc.externalId === field.pageId) return true;
      if (field.waPhoneNumberId && acc.externalId === field.waPhoneNumberId) return true;
      if (field.telegramBotId && acc.externalId === field.telegramBotId) return true;
      return false;
    });
    if (hasAccountMatch) return true;

    // 2. Specific channel match
    if (field.waPhoneNumberId && c.waPhoneNumberId === field.waPhoneNumberId) return true;
    if (field.pageId && c.pageId === field.pageId) return true;
    if (field.telegramBotId && c.telegramBotId === field.telegramBotId) return true;
    if (field.widgetId && c.widgetId === field.widgetId) return true;

    return false;
  });
}
